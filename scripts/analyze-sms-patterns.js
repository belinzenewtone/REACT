#!/usr/bin/env node
/**
 * SMS Pattern Analyzer — dev tool only, never runs in production.
 *
 * Two input modes:
 *
 *   MODE A — from device SMS dump (recommended — catches unrecognised senders):
 *     1. node scripts/dump-device-sms.js device-sms-dump.json
 *     2. ANTHROPIC_API_KEY=sk-ant-... node scripts/analyze-sms-patterns.js --json device-sms-dump.json
 *
 *   MODE B — from app SQLite database (only sees already-imported messages):
 *     1. adb exec-out run-as com.belinze.lifeos cat databases/lifeos.db > lifeos-export.db
 *     2. ANTHROPIC_API_KEY=sk-ant-... node scripts/analyze-sms-patterns.js lifeos-export.db
 *
 * Optional second argument overrides the output .md path.
 */

'use strict';

const Database = require('better-sqlite3');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const args = process.argv.slice(2);
const jsonMode = args.includes('--json');
const positional = args.filter(a => !a.startsWith('--'));
const INPUT_PATH = positional[0];
const OUTPUT_PATH = positional[1] || 'sms-pattern-report.md';
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MAX_PER_INSTITUTION = 25;
const MAX_FAILURES = 150;
const MAX_QUEUE_FAILURES = 60;

// ── PII masking ─────────────────────────────────────────────────────────────

function maskPii(text) {
  if (!text) return '';
  return text
    // Kenyan mobile numbers: 07xx, 01xx, +2547xx, 2547xx
    .replace(/\+?2547\d{8}\b/g, '[PHONE]')
    .replace(/\+?2541\d{8}\b/g, '[PHONE]')
    .replace(/\b07\d{8}\b/g, '[PHONE]')
    .replace(/\b01\d{8}\b/g, '[PHONE]')
    // Long numeric strings that look like account/card numbers (10+ digits, not amounts)
    .replace(/\b(\d{10,19})\b/g, (m) => `[ACCT-${m.slice(-4)}]`)
    // M-PESA style reference codes — keep the prefix so patterns are visible
    .replace(/\b([A-Z]{2,3}\d[A-Z0-9]{8})\b/g, (m) => `[REF-${m.slice(0, 4)}xxxx]`);
}

// ── Data loaders ─────────────────────────────────────────────────────────────

function loadFromJson(jsonPath) {
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const { sms = [] } = raw;

  const byInstitution = {};
  const unrecognised = [];

  for (const entry of sms) {
    const id = entry.institutionId || 'unknown';
    if (id === 'unrecognised' || id === 'unknown') {
      unrecognised.push({ sender: entry.sender, body: entry.body });
    } else {
      if (!byInstitution[id]) byInstitution[id] = [];
      if (byInstitution[id].length < MAX_PER_INSTITUTION) {
        byInstitution[id].push({ sender: entry.sender, body: entry.body });
      }
    }
  }

  const institutionCounts = Object.entries(byInstitution)
    .map(([id, arr]) => ({ institution_id: id, n: arr.length }))
    .sort((a, b) => b.n - a.n);

  return {
    failures: unrecognised.slice(0, MAX_FAILURES).map(u => ({
      raw_message: u.body,
      failure_reason: 'unrecognised sender',
      outcome: 'unrecognised',
    })),
    byInstitution,
    queueFailed: [],
    totalParsed: sms.length,
    institutionCounts,
    sourceMeta: raw,
  };
}

function loadFromDb(dbPath) {
  const db = new Database(dbPath, { readonly: true });

  const failures = db.prepare(`
    SELECT raw_message, failure_reason, outcome
    FROM   import_audit
    WHERE  outcome NOT IN ('success', 'duplicate')
    ORDER  BY created_at DESC
    LIMIT  ?
  `).all(MAX_FAILURES);

  const parsedRows = db.prepare(`
    SELECT institution_id, raw_sender, raw_sms
    FROM   transactions
    WHERE  raw_sms   IS NOT NULL
      AND  raw_sms   != ''
      AND  raw_sender IS NOT NULL
      AND  deleted_at IS NULL
    ORDER  BY institution_id, date DESC
  `).all();

  const queueFailed = db.prepare(`
    SELECT body, sender_address, last_error, status
    FROM   sms_ingest_queue
    WHERE  status IN ('failed', 'dead', 'quarantined')
    ORDER  BY received_at DESC
    LIMIT  ?
  `).all(MAX_QUEUE_FAILURES);

  const totalParsed = db.prepare(
    `SELECT COUNT(*) as n FROM transactions WHERE raw_sms != '' AND deleted_at IS NULL`
  ).get();

  const institutionCounts = db.prepare(`
    SELECT institution_id, COUNT(*) as n
    FROM   transactions WHERE deleted_at IS NULL
    GROUP  BY institution_id ORDER BY n DESC
  `).all();

  db.close();

  const byInstitution = {};
  for (const row of parsedRows) {
    const key = row.institution_id || 'unknown';
    if (!byInstitution[key]) byInstitution[key] = [];
    if (byInstitution[key].length < MAX_PER_INSTITUTION)
      byInstitution[key].push({ sender: row.raw_sender || '(none)', body: maskPii(row.raw_sms) });
  }

  return { failures, byInstitution, queueFailed, totalParsed: totalParsed?.n ?? 0, institutionCounts };
}

// ── Claude API call ──────────────────────────────────────────────────────────

async function callClaude(client, prompt) {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.content[0].text;
}

// ── Prompt builders ──────────────────────────────────────────────────────────

function failuresPrompt(failures) {
  const items = failures.map((f, i) =>
    `### SMS ${i + 1}  (outcome: ${f.outcome}, reason: ${f.failure_reason || '—'})\n\`\`\`\n${maskPii(f.raw_message)}\n\`\`\``
  ).join('\n\n');

  return `You are a senior mobile engineer helping improve a Kenyan financial SMS parser (Android/Kotlin).

The parser already handles M-PESA, KCB, Equity, Co-op, NCBA/Loop, Absa, Stanbic, DTB, I&M, Family Bank, HF Group, Gulf African Bank, and ~20 others.

These SMS messages **FAILED** to parse or were not recognized. For each:
1. Identify which institution it likely comes from.
2. State why it probably failed (unknown sender, missing amount, unexpected field order, etc.).
3. Extract the key fields manually: amount (KES), direction (credit/debit), counterparty, reference, balance.
4. Suggest a concrete regex or rule change for \`GenericBankParser.kt\` or \`InstitutionDetector.kt\`.

Group findings by institution. Use \`##\` headers. Wrap regex in code blocks.

---
${items}`;
}

function institutionPrompt(instId, samples) {
  const items = samples.map((s, i) =>
    `### Sample ${i + 1}  (sender: \`${s.sender}\`)\n\`\`\`\n${s.body}\n\`\`\``
  ).join('\n\n');

  return `You are a senior mobile engineer helping improve a Kenyan financial SMS parser (Android/Kotlin).

Analyze these **${instId.toUpperCase()}** SMS samples:
1. How many distinct message templates/variants exist?
2. For each variant — which fields are present? (amount, direction, counterparty, reference, balance, fee, account, date)
3. What is the most reliable regex for each field in each variant? (show Kotlin regex syntax)
4. Any edge cases or format inconsistencies to watch out for?
5. Is the institution ID \`${instId}\` correct, or does any sample look like a different institution?

Be concise and technical. Use code blocks for all regex.

---
${items}`;
}

function queuePrompt(queueFailed) {
  const items = queueFailed.map((q, i) =>
    `### Item ${i + 1}  (sender: \`${q.sender_address || '?'}\`, status: ${q.status}, error: ${q.last_error || '—'})\n\`\`\`\n${maskPii(q.body)}\n\`\`\``
  ).join('\n\n');

  return `You are a senior mobile engineer. These SMS messages are stuck in the processing queue (status: failed/dead/quarantined). Analyze why each is failing and suggest fixes for the Kotlin parser:

${items}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!INPUT_PATH) {
    console.error('Usage:\n');
    console.error('  # From device SMS dump (recommended):');
    console.error('  node scripts/dump-device-sms.js device-sms-dump.json');
    console.error('  ANTHROPIC_API_KEY=sk-ant-... node scripts/analyze-sms-patterns.js --json device-sms-dump.json\n');
    console.error('  # From app database:');
    console.error('  adb exec-out run-as com.belinze.lifeos cat databases/lifeos.db > lifeos-export.db');
    console.error('  ANTHROPIC_API_KEY=sk-ant-... node scripts/analyze-sms-patterns.js lifeos-export.db');
    process.exit(1);
  }

  if (!API_KEY) {
    console.error('Error: ANTHROPIC_API_KEY environment variable not set.');
    process.exit(1);
  }

  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`Error: file not found: ${INPUT_PATH}`);
    process.exit(1);
  }

  console.log(`\n=== SMS Pattern Analyzer ===\n`);
  console.log(`Mode   : ${jsonMode ? 'JSON dump (all device SMS)' : 'SQLite database'}`);
  console.log(`Input  : ${INPUT_PATH}`);
  console.log(`Output : ${OUTPUT_PATH}\n`);

  console.log('Loading data...');
  const { failures, byInstitution, queueFailed, totalParsed, institutionCounts, sourceMeta } =
    jsonMode ? loadFromJson(INPUT_PATH) : loadFromDb(INPUT_PATH);

  if (sourceMeta) {
    console.log(`  Device SMS total       : ${sourceMeta.deviceSmsCount ?? '?'}`);
    console.log(`  Financial (recognised) : ${sourceMeta.financialCount ?? '?'}`);
    console.log(`  Financial (unknown)    : ${sourceMeta.unknownFinancialCount ?? '?'}`);
  }

  console.log(`  Total parsed transactions with raw SMS : ${totalParsed}`);
  console.log(`  Institutions found                    : ${Object.keys(byInstitution).join(', ')}`);
  console.log(`  Failed / unrecognized (import_audit)  : ${failures.length}`);
  console.log(`  Queue failures                        : ${queueFailed.length}\n`);

  if (totalParsed === 0 && failures.length === 0) {
    console.error('No data found. Make sure the DB path is correct and the app has imported some messages.');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey: API_KEY });
  const sections = [];

  // Stats table
  const statsTable = [
    '| Institution | Transaction Count |',
    '|-------------|-------------------|',
    ...institutionCounts.map(r => `| ${r.institution_id || 'unknown'} | ${r.n} |`),
  ].join('\n');
  sections.push(`## Institution Statistics\n\n${statsTable}`);

  // Failures analysis
  if (failures.length > 0) {
    console.log(`Analyzing ${failures.length} failed/unrecognized SMS...`);
    const analysis = await callClaude(client, failuresPrompt(failures));
    sections.push(`## Failed / Unrecognized SMS\n\n${analysis}`);
    console.log('  Done.');
  } else {
    console.log('No failures found — all SMS were recognized. (This is great!)');
  }

  // Per-institution analysis
  const institutions = Object.entries(byInstitution);
  for (const [instId, samples] of institutions) {
    console.log(`Analyzing ${instId} (${samples.length} samples)...`);
    const analysis = await callClaude(client, institutionPrompt(instId, samples));
    sections.push(`## Institution: ${instId}\n\n${analysis}`);
    console.log('  Done.');
  }

  // Queue failures
  if (queueFailed.length > 0) {
    console.log(`Analyzing ${queueFailed.length} queue failures...`);
    const analysis = await callClaude(client, queuePrompt(queueFailed));
    sections.push(`## Queue Failures\n\n${analysis}`);
    console.log('  Done.');
  }

  // Write report
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const report = [
    `# SMS Pattern Analysis Report`,
    `_Generated: ${timestamp}_`,
    '',
    ...sections.map(s => s + '\n'),
  ].join('\n\n');

  fs.writeFileSync(OUTPUT_PATH, report, 'utf8');
  console.log(`\nReport written to: ${OUTPUT_PATH}`);
  console.log('Open it in any Markdown viewer to read the analysis.\n');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  if (err.status === 401) console.error('Check your ANTHROPIC_API_KEY.');
  if (err.code === 'SQLITE_NOTADB') console.error('File is not a valid SQLite database.');
  process.exit(1);
});
