#!/usr/bin/env node
/**
 * dump-device-sms.js — pulls ALL SMS from a connected Android device and
 * filters them to financial messages only, saving to a JSON file for analysis.
 *
 * Usage:
 *   node scripts/dump-device-sms.js                       # saves to device-sms-dump.json
 *   node scripts/dump-device-sms.js my-dump.json          # custom output path
 *   node scripts/dump-device-sms.js --all my-dump.json    # include non-financial SMS too
 *
 * Requires: adb in PATH, USB debugging enabled, device connected.
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const includeAll = args.includes('--all');
const outputPath = args.filter(a => !a.startsWith('--'))[0] || 'device-sms-dump.json';

// ── Institution / financial sender knowledge ──────────────────────────────────
// Mirrors InstitutionDetector.kt — update both if you add a new bank.

const SENDER_MAP = {
  // Mobile money
  MPESA: 'mpesa',        'M-PESA': 'mpesa',       M_PESA: 'mpesa',
  AIRTEL: 'airtel',      AIRTELMONEY: 'airtel',    AIRTELKE: 'airtel',
  'T-KASH': 'tkash',     TKASH: 'tkash',           TELKOM: 'tkash',
  // Tier 1 banks
  KCB: 'kcb',            KCBBANK: 'kcb',           KCBGROUP: 'kcb',
  KCBMOBILE: 'kcb',      VOOMA: 'kcb',             'KCB-VOOMA': 'kcb',
  EQUITY: 'equity',      EQUITYBNK: 'equity',      EQUITYBANK: 'equity',
  EQUITYMOBILE: 'equity', EAZZYBK: 'equity',       EAZZYBANK: 'equity',
  COOPBANK: 'coopbank',  COOPBNK: 'coopbank',      MCOOPBANK: 'coopbank',
  COOPCASH: 'coopbank',  COOP: 'coopbank',         'CO-OPBANK': 'coopbank',
  NCBA: 'ncba',          NCBABANK: 'ncba',         NCBA_BANK: 'ncba',
  NCBAGROUP: 'ncba',     LOOP: 'ncba',             NCBALOOP: 'ncba',
  NCBA_LOOP: 'ncba',     LOOPBANK: 'ncba',
  // Tier 2 banks
  ABSA: 'absa',          ABSAKENYA: 'absa',        ABSABANK: 'absa',
  BARCLAYS: 'absa',      BARCLAYSKE: 'absa',
  STANCHART: 'stanchart', SCB: 'stanchart',        SCBANK: 'stanchart',
  DTB: 'dtb',            DTBKENYA: 'dtb',          DTBANK: 'dtb',
  FAMILYBANK: 'family',  FAMILYBNK: 'family',      FAMILYBK: 'family',
  IMBANK: 'im',          'I&MBANK': 'im',          IANDMBANK: 'im',
  STANBIC: 'stanbic',    STANBICKE: 'stanbic',     STANBICBANK: 'stanbic',
  // Tier 3 / specialist
  SBM: 'sbm',            SBMBANK: 'sbm',           SBMKENYA: 'sbm',
  HFGROUP: 'hfgroup',    HFBANK: 'hfgroup',        HFCK: 'hfgroup',
  GULF: 'gulf',          GULFBANK: 'gulf',         GULFAFRICAN: 'gulf',
  BOA: 'boa',            BOAKENYA: 'boa',          BANKOFAFRICA: 'boa',
  PRIMEBANK: 'primebank', PRIMEBK: 'primebank',
  CONSOLIDATEDBANK: 'consolidated', CONSO: 'consolidated',
  CREDITBANK: 'creditbank', CREDITBNK: 'creditbank',
  SIDIAN: 'sidian',      SIDIANBANK: 'sidian',     KREP: 'sidian',
  KINGDOM: 'kingdom',    KINGDOMBANK: 'kingdom',   JAMIIBORA: 'kingdom',
  VICTORIABANK: 'victoria', VCB: 'victoria',
  GUARDIAN: 'guardian',  GUARDIANBANK: 'guardian',
  TRANSNATIONAL: 'transnational', TNB: 'transnational',
  PESALINK: 'pesalink',  IPSL: 'pesalink',         KBAPESALINK: 'pesalink',
};

// Sender substrings that imply financial (order matters — most specific first)
const SENDER_SUBSTRINGS = [
  'MPESA', 'EQUITY', 'NCBA', 'LOOP', 'COOPBANK', 'COOPCASH',
  'STANBIC', 'STANCHART', 'BARCLAYS', 'ABSA', 'FAMILYBANK',
  'IMBANK', 'CREDITBANK', 'SIDIAN', 'KINGDOM', 'PESALINK',
  'KCB', 'BOA', 'SBM', 'HF', 'GULF', 'AIRTEL', 'TKASH', 'TELKOM',
  'PRIME', 'VICTORIA', 'GUARDIAN', 'TRANSNATIONAL',
];

// Body keywords that indicate a financial SMS even with an unrecognised sender
const BODY_KEYWORDS = [
  'k.shs', 'kshs', 'ksh.', 'k shs', 'kes ', 'kes.', ' kes',
  'mpesa', 'm-pesa', 'equity bank', 'kcb', 'ncba',
  'credited', 'debited', 'available balance', 'account balance',
  'a/c balance', 'a/c no.', 'airtel money', 'loop by ncba',
  'your account has been', 'your loan', 'fuliza',
];

function detectInstitution(address, body) {
  const upper = address.trim().toUpperCase().replace(/\s+/g, '');
  // Tier 1a: exact sender map
  if (SENDER_MAP[upper]) return { id: SENDER_MAP[upper], tier: 1 };
  // Tier 1b: sender contains a known key
  for (const sub of SENDER_SUBSTRINGS) {
    if (upper.includes(sub)) return { id: SENDER_MAP[sub] || sub.toLowerCase(), tier: 1 };
  }
  // Tier 2: body keyword
  const bodyLower = body.toLowerCase();
  for (const kw of BODY_KEYWORDS) {
    if (bodyLower.includes(kw)) return { id: 'unrecognised', tier: 2 };
  }
  return null;
}

// ── PII masking ───────────────────────────────────────────────────────────────

function maskPii(text) {
  return text
    .replace(/\+?2547\d{8}\b/g, '[PHONE]')
    .replace(/\+?2541\d{8}\b/g, '[PHONE]')
    .replace(/\b07\d{8}\b/g, '[PHONE]')
    .replace(/\b01\d{8}\b/g, '[PHONE]')
    .replace(/\b(\d{10,19})\b/g, (m) => `[ACCT-${m.slice(-4)}]`)
    .replace(/\b([A-Z]{2,3}\d[A-Z0-9]{8})\b/g, (m) => `[REF-${m.slice(0,4)}xxxx]`);
}

// ── ADB helpers ───────────────────────────────────────────────────────────────

function checkAdb() {
  try {
    const devices = execSync('adb devices', { encoding: 'utf8' })
      .split('\n').slice(1)
      .filter(l => l.trim() && !l.startsWith('*') && !l.includes('List of'));

    if (devices.length === 0) {
      console.error('Error: no ADB devices connected. Enable USB debugging and connect your device.');
      process.exit(1);
    }
    console.log(`Device: ${devices[0].trim()}`);
  } catch {
    console.error('Error: adb not found. Install Android SDK platform-tools and add to PATH.');
    process.exit(1);
  }
}

// ── SMS dump — batch by offset ────────────────────────────────────────────────

function dumpAllSms() {
  process.stdout.write('\nDumping SMS from device (may take a moment)...');

  // Note: --projection uses colon-separated columns on Android's content tool.
  // The whole command is quoted as a single shell string so the sort argument
  // (which contains a space) survives the adb → device shell boundary.
  const raw = execSync(
    'adb shell "content query --uri content://sms --projection address:body:date"',
    { encoding: 'utf8', maxBuffer: 200 * 1024 * 1024 }
  );

  const all = parseContentQueryOutput(raw);
  console.log(` done. Total raw: ${all.length}`);
  return all;
}

// ── Parse content query output ────────────────────────────────────────────────
// Format: "Row: N address=SENDER, body=TEXT WITH POSSIBLE COMMAS, date=TIMESTAMP\n"
// body is always between "body=" and the last ", date=\d+"

function parseContentQueryOutput(raw) {
  const results = [];
  // Re-join any split lines (body may contain \n on some devices)
  const text = raw.replace(/\r/g, '');
  const lines = [];
  let current = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('Row:') && current) {
      lines.push(current);
      current = line;
    } else {
      current = current ? current + ' ' + line : line;
    }
  }
  if (current) lines.push(current);

  for (const line of lines) {
    if (!line.startsWith('Row:')) continue;

    // Extract address (from "address=" to first ", body=")
    const addrStart = line.indexOf(' address=');
    const bodyMarker = line.indexOf(', body=', addrStart);
    if (addrStart < 0 || bodyMarker < 0) continue;
    const address = line.slice(addrStart + 9, bodyMarker);

    // Extract date from end
    const dateMatch = line.match(/,\s*date=(\d+)\s*$/);
    if (!dateMatch) continue;
    const date = parseInt(dateMatch[1], 10);

    // Body is between ", body=" and the last ", date="
    const bodyStart = bodyMarker + 7;
    const bodyEnd = line.lastIndexOf(', date=');
    if (bodyStart >= bodyEnd) continue;
    const body = line.slice(bodyStart, bodyEnd).trim();

    if (!address || !body) continue;
    results.push({ address, body, date });
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log('=== Device SMS Dumper ===\n');
  checkAdb();

  const allSms = dumpAllSms();

  if (allSms.length === 0) {
    console.error('No SMS retrieved. Check ADB permissions.');
    process.exit(1);
  }

  // Filter and classify
  const financial = [];
  const unknownFinancial = [];
  const skipped = { count: 0 };

  for (const sms of allSms) {
    const detection = detectInstitution(sms.address, sms.body);
    if (detection) {
      const entry = {
        sender: sms.address,
        institutionId: detection.id,
        detectionTier: detection.tier,
        date: new Date(sms.date).toISOString(),
        body: maskPii(sms.body),
      };
      if (detection.id === 'unrecognised') {
        unknownFinancial.push(entry);
      } else {
        financial.push(entry);
      }
    } else if (includeAll) {
      financial.push({
        sender: sms.address,
        institutionId: 'non-financial',
        detectionTier: 0,
        date: new Date(sms.date).toISOString(),
        body: maskPii(sms.body),
      });
    } else {
      skipped.count++;
    }
  }

  const output = {
    exportedAt: new Date().toISOString(),
    deviceSmsCount: allSms.length,
    financialCount: financial.length,
    unknownFinancialCount: unknownFinancial.length,
    skippedCount: skipped.count,
    sms: [...financial, ...unknownFinancial],
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

  // Stats breakdown
  const byInst = {};
  for (const s of output.sms) {
    byInst[s.institutionId] = (byInst[s.institutionId] || 0) + 1;
  }

  console.log('\n── Results ─────────────────────────────────────────────────');
  console.log(`Total device SMS         : ${allSms.length}`);
  console.log(`Financial (recognised)   : ${financial.length}`);
  console.log(`Financial (unrecognised) : ${unknownFinancial.length}`);
  console.log(`Skipped (non-financial)  : ${skipped.count}`);
  console.log('\nBy institution:');
  for (const [id, n] of Object.entries(byInst).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id.padEnd(20)} ${n}`);
  }
  console.log(`\nSaved to: ${outputPath}`);
  console.log('\nNext step:');
  console.log(`  ANTHROPIC_API_KEY=sk-ant-... node scripts/analyze-sms-patterns.js --json ${outputPath}`);
}

main();
