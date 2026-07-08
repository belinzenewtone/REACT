#!/usr/bin/env node
/**
 * Forces a single, consistent NDK version across the app module and every
 * autolinked native module, so they don't disagree on which NDK to use
 * ("NDK from ndk.dir ... disagrees with android.ndkVersion" errors).
 *
 * Patches build.gradle files directly (text injection) rather than relying on
 * Gradle's afterEvaluate/projectsEvaluated hooks — AGP computes its cxx model
 * during each project's own evaluation, before any such hook can run, so a
 * Gradle-side override is too late. A source patch applied before Gradle even
 * starts is not.
 *
 * Deliberately does NOT set ndk.dir/ANDROID_NDK_HOME to force a path: on
 * Windows, CMake 3.22.1's Android platform module can corrupt
 * CMAKE_ANDROID_NDK when it's fed via those overrides (embedded backslash
 * sequences get misparsed, breaking compiler detection). Leaving path
 * resolution to AGP's normal per-version auto-detection (sdk.dir + "ndk" +
 * version) avoids that entirely.
 *
 * Usage: node scripts/pin-ndk.js [ndkVersion]
 */
const fs = require('fs');
const path = require('path');

const NDK_VERSION = process.argv[2] || '28.2.13676358';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');

if (!fs.existsSync(ANDROID_DIR)) {
  console.error('android/ not found — run `expo prebuild` first.');
  process.exit(1);
}

// `expo prebuild --clean` wipes android/local.properties along with everything
// else. Regenerate it (forward slashes — Windows backslashes here trip up the
// same AGP/CMake escaping bug worked around below).
const LOCAL_PROPS_PATH = path.join(ANDROID_DIR, 'local.properties');
const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
  (process.platform === 'win32'
    ? path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk')
    : path.join(process.env.HOME || '', 'Android', 'Sdk'));
if (!fs.existsSync(LOCAL_PROPS_PATH) && fs.existsSync(sdkRoot)) {
  fs.writeFileSync(LOCAL_PROPS_PATH, `sdk.dir=${sdkRoot.replace(/\\/g, '/')}\n`, 'utf8');
  console.log(`Wrote android/local.properties (sdk.dir=${sdkRoot})`);
}

function findBlockStart(s, name) {
  const re = new RegExp('\\b' + name + '\\s*\\{');
  const m = re.exec(s);
  return m ? m.index : -1;
}

function pinNdkVersion(gradlePath) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');

  if (/\bndkVersion\s+["']/.test(gradle)) {
    // Explicit literal already present from a previous run.
    if (gradle.includes(`ndkVersion "${NDK_VERSION}"`) || gradle.includes(`ndkVersion '${NDK_VERSION}'`)) {
      return 'already-pinned';
    }
    gradle = gradle.replace(/\bndkVersion\s+["'][^"']*["']/, `ndkVersion "${NDK_VERSION}"`);
    fs.writeFileSync(gradlePath, gradle, 'utf8');
    return 'replaced';
  }

  if (/\bndkVersion\s+rootProject\.ext\.ndkVersion/.test(gradle)) {
    gradle = gradle.replace(/\bndkVersion\s+rootProject\.ext\.ndkVersion/, `ndkVersion "${NDK_VERSION}"`);
    fs.writeFileSync(gradlePath, gradle, 'utf8');
    return 'replaced';
  }

  const androidStart = findBlockStart(gradle, 'android');
  if (androidStart === -1) return 'no-android-block';
  const openBrace = gradle.indexOf('{', androidStart);
  if (openBrace === -1) return 'no-android-block';
  gradle = gradle.slice(0, openBrace + 1) + `\n    ndkVersion "${NDK_VERSION}"\n` + gradle.slice(openBrace + 1);
  fs.writeFileSync(gradlePath, gradle, 'utf8');
  return 'injected';
}

const targets = [path.join(ANDROID_DIR, 'app', 'build.gradle')];

const NODE_MODULES = path.join(PROJECT_ROOT, 'node_modules');
if (fs.existsSync(NODE_MODULES)) {
  for (const pkgName of fs.readdirSync(NODE_MODULES)) {
    if (pkgName.startsWith('.')) continue;
    const pkgDir = path.join(NODE_MODULES, pkgName);
    // Scoped packages (@scope/name)
    const scanDirs = pkgName.startsWith('@')
      ? fs.readdirSync(pkgDir).map((n) => path.join(pkgDir, n))
      : [pkgDir];
    for (const dir of scanDirs) {
      const buildGradle = path.join(dir, 'android', 'build.gradle');
      if (fs.existsSync(buildGradle)) {
        const hasNative =
          fs.existsSync(path.join(dir, 'android', 'src', 'main', 'jni')) ||
          fs.existsSync(path.join(dir, 'android', 'CMakeLists.txt')) ||
          fs.readFileSync(buildGradle, 'utf8').includes('externalNativeBuild');
        if (hasNative) targets.push(buildGradle);
      }
    }
  }
}

let pinned = 0;
for (const t of targets) {
  const rel = path.relative(PROJECT_ROOT, t).replace(/\\/g, '/');
  const result = pinNdkVersion(t);
  if (result === 'injected' || result === 'replaced') {
    pinned++;
    console.log(`[pin-ndk] ${rel}: ${result} → ${NDK_VERSION}`);
  } else if (result === 'already-pinned') {
    console.log(`[pin-ndk] ${rel}: already pinned`);
  }
}

console.log(`NDK pinned to ${NDK_VERSION} for ${pinned + targets.length - pinned} native module(s) (${pinned} updated this run).`);
