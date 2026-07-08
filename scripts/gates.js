#!/usr/bin/env node
/**
 * Lightweight architecture gates — run locally via `npm run gates` and in CI.
 * Mirrors the REACT sibling app's gate discipline, tuned for RFINAL.
 *
 * Gates:
 *  1. banned-patterns — APIs that have already caused production bugs here.
 *  2. file-size — no source file may exceed MAX_LINES (soft architecture cap).
 *  3. import-boundaries — screens/components must reach data through
 *     stores/services, not each other's internals.
 *
 * Exit code 1 on any violation; prints every violation, not just the first.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAX_LINES = 1100;

/**
 * Pre-existing violations, grandfathered so the gate passes today while
 * blocking NEW violations. Shrink this list over time — never grow it.
 * Format: exact violation-message prefix (file[:line] is enough).
 */
const GRANDFATHERED = [
  'src/components/calendar/CalendarEventItem.tsx:7 component imports a repository',
  'src/components/calendar/CalendarTaskItem.tsx:7 component imports a repository',
  'src/components/planner/TaskEventForm.tsx has ', // 1110+ lines — split pending
  'src/components/planner/TaskEventForm.tsx:36 component imports a repository',
  'src/components/planner/TaskEventForm.tsx:37 component imports a repository',
];

/** Recursively collect .ts/.tsx files under a dir. */
function collect(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      collect(p, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(p);
    }
  }
  return out;
}

const files = [
  ...collect(path.join(ROOT, 'src')),
  path.join(ROOT, 'modules', 'lifeos-sms', 'index.ts'),
];

const violations = [];
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// ── Gate 1: banned patterns ────────────────────────────────────────────────
const BANNED = [
  {
    re: /NativeModulesProxy/,
    why: 'NativeModulesProxy is dead on the New Architecture — use requireNativeModule (this exact bug silenced SMS import for weeks)',
  },
  {
    re: /console\.log\(/,
    why: 'no console.log in production source — use console.warn/error or remove',
  },
  {
    re: /localStorage|sessionStorage/,
    why: 'web storage APIs do not exist in React Native',
  },
  {
    re: /\.catch\(\(\)\s*=>\s*null\)/,
    why: 'silently swallowed promise (catch(() => null)) — handle or log the failure',
  },
];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split('\n');

  for (const rule of BANNED) {
    lines.forEach((line, i) => {
      if (rule.re.test(line) && !line.trim().startsWith('//') && !line.trim().startsWith('*')) {
        violations.push(`${rel(file)}:${i + 1} banned pattern ${rule.re} — ${rule.why}`);
      }
    });
  }

  // ── Gate 2: file size ────────────────────────────────────────────────────
  if (lines.length > MAX_LINES) {
    violations.push(`${rel(file)} has ${lines.length} lines (max ${MAX_LINES}) — split it`);
  }

  // ── Gate 3: import boundaries ────────────────────────────────────────────
  const r = rel(file);
  if (r.startsWith('src/components/')) {
    // Components must not import repositories directly — go through stores/services.
    lines.forEach((line, i) => {
      if (/from '.*\/database\/repositories\//.test(line)) {
        violations.push(`${r}:${i + 1} component imports a repository directly — use a store or service`);
      }
    });
  }
  if (r.startsWith('src/utils/')) {
    // Utils must stay pure: no store, screen, or native-module imports.
    lines.forEach((line, i) => {
      if (/from '.*\/(store|screens|navigation)(?:\/|$)/.test(line) || /from '.*modules\/lifeos-sms/.test(line)) {
        violations.push(`${r}:${i + 1} util imports app state/UI — utils must stay pure`);
      }
    });
  }
}

const active = violations.filter((v) => !GRANDFATHERED.some((g) => v.startsWith(g)));
const grandfatheredHits = violations.length - active.length;

if (active.length > 0) {
  console.error(`\n✗ ${active.length} gate violation(s):\n`);
  for (const v of active) console.error('  ' + v);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ gates passed (${files.length} files checked` +
    (grandfatheredHits ? `, ${grandfatheredHits} grandfathered` : '') +
    ')',
);
