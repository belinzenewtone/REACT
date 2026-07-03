#!/usr/bin/env node
/**
 * Postinstall patch for expo@56.0.12 / RN 0.85.3 release crash:
 *
 *   [runtime not ready]: ReferenceError: Property 'FormData' doesn't exist
 *
 * Expo's WinterCG runtime polyfills run before React Native's InitializeCore
 * has installed FormData/AbortSignal in release bundles. We force React Native
 * to initialize first and make the patch calls fall back to globalThis.
 */

const fs = require('fs');
const path = require('path');

const FILES = [
  {
    target: path.join('node_modules', 'expo', 'src', 'Expo.fx.tsx'),
    search:
      "// load expo-asset immediately to set a custom `source` transformer in React Native\nimport './winter';",
    replace:
      "// load expo-asset immediately to set a custom `source` transformer in React Native\n// Initialize React Native globals (FormData, AbortSignal, etc.) before Expo's\n// WinterCG polyfills run, otherwise release builds crash with \"Property\n// 'FormData' doesn't exist\" on startup.\nimport 'react-native';\nimport './winter';",
  },
  {
    target: path.join('node_modules', 'expo', 'src', 'winter', 'runtime.native.ts'),
    search:
      'installFormDataPatch(FormData);\ninstallAbortSignalPatch(AbortSignal);',
    replace:
      "// Use globalThis access to avoid a ReferenceError if these globals haven't been\n// installed by React Native's InitializeCore yet.\ninstallFormDataPatch(globalThis.FormData ?? FormData);\ninstallAbortSignalPatch(globalThis.AbortSignal ?? AbortSignal);",
  },
];

const root = path.join(__dirname, '..');

for (const { target, search, replace } of FILES) {
  const fullPath = path.join(root, target);
  if (!fs.existsSync(fullPath)) {
    console.warn(`[patch-expo-formdata] skipping: ${target} not found`);
    continue;
  }
  const original = fs.readFileSync(fullPath, 'utf8');
  if (original.includes(replace.split('\n')[0])) {
    console.log(`[patch-expo-formdata] already patched: ${target}`);
    continue;
  }
  if (!original.includes(search)) {
    console.warn(`[patch-expo-formdata] search string not found in ${target}`);
    continue;
  }
  fs.writeFileSync(fullPath, original.replace(search, replace), 'utf8');
  console.log(`[patch-expo-formdata] patched: ${target}`);
}
