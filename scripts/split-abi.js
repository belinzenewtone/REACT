#!/usr/bin/env node
/**
 * Injects a Gradle `splits.abi` block into android/app/build.gradle so
 * `assembleRelease` produces separate signed APKs per ABI instead of one
 * universal APK: app-armeabi-v7a-release.apk (v7) and app-arm64-v8a-release.apk (v8).
 * Idempotent — safe to run on every build (prebuild regenerates build.gradle each time).
 *
 * Usage: node scripts/split-abi.js
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const GRADLE_PATH = path.join(PROJECT_ROOT, 'android', 'app', 'build.gradle');

if (!fs.existsSync(GRADLE_PATH)) {
  console.error('android/app/build.gradle not found — run `expo prebuild` first.');
  process.exit(1);
}

let gradle = fs.readFileSync(GRADLE_PATH, 'utf8');

if (gradle.includes('splits {') && gradle.includes('abi {')) {
  console.log('ABI splits already configured — skipping.');
  process.exit(0);
}

const SPLITS_BLOCK =
  '\n    splits {\n' +
  '        abi {\n' +
  '            reset()\n' +
  '            enable true\n' +
  '            universalApk false\n' +
  "            include 'armeabi-v7a', 'arm64-v8a'\n" +
  '        }\n' +
  '    }\n';

function findMatchingBrace(s, startSearchFrom) {
  const openIdx = s.indexOf('{', startSearchFrom);
  if (openIdx === -1) return -1;
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') { depth--; if (depth === 0) return i; }
  }
  return -1;
}
function findBlockStart(s, name) {
  const re = new RegExp('\\b' + name + '\\s*\\{');
  const m = re.exec(s);
  return m ? m.index : -1;
}

const androidStart = findBlockStart(gradle, 'android');
if (androidStart === -1) {
  console.error('Could not locate the `android { }` block in build.gradle.');
  process.exit(1);
}
const openBrace = gradle.indexOf('{', androidStart);
gradle = gradle.slice(0, openBrace + 1) + SPLITS_BLOCK + gradle.slice(openBrace + 1);

// Give each ABI variant a distinct, predictable versionCode offset so the
// Play Store treats them as separate APKs for the same versionName.
const ABI_VERSION_CODES = {
  'armeabi-v7a': 1,
  'arm64-v8a': 2,
};
const groovyMap = '[' + Object.entries(ABI_VERSION_CODES).map(([k, v]) => `'${k}': ${v}`).join(', ') + ']';
const VARIANT_BLOCK =
  '\nandroid.applicationVariants.all { variant ->\n' +
  '        variant.outputs.each { output ->\n' +
  '            def abiCodes = ' + groovyMap + '\n' +
  '            def abiName = output.getFilter(com.android.build.OutputFile.ABI)\n' +
  '            if (abiCodes.containsKey(abiName)) {\n' +
  '                output.versionCodeOverride = variant.versionCode * 10 + abiCodes.get(abiName)\n' +
  '            }\n' +
  '        }\n' +
  '    }\n';

if (!gradle.includes('applicationVariants.all')) {
  gradle = gradle + VARIANT_BLOCK;
}

fs.writeFileSync(GRADLE_PATH, gradle, 'utf8');
console.log("ABI splits injected: armeabi-v7a (v7), arm64-v8a (v8) — universal APK disabled.");
