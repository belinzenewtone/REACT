// Run React Native's core initialization before anything else. In release
// builds the module load order can place Expo's WinterCG polyfills (which
// touch FormData/AbortSignal/performance) before RN has installed its globals,
// causing startup crashes like "Property 'FormData' doesn't exist" and
// "Cannot read property 'now' of undefined".
import 'react-native/Libraries/Core/InitializeCore';

// Eagerly install the globals that Expo's WinterCG polyfills and RN's
// performance logger need. Some are lazy getters, so just importing
// InitializeCore isn't always enough.
if (typeof globalThis.FormData === 'undefined') {
  const RNFormData = require('react-native/Libraries/Network/FormData').default;
  globalThis.FormData = RNFormData;
}
if (typeof globalThis.AbortSignal === 'undefined') {
  const { AbortSignal: RNAbortSignal } = require('abort-controller/dist/abort-controller');
  globalThis.AbortSignal = RNAbortSignal;
}
if (
  typeof globalThis.performance === 'undefined' ||
  typeof globalThis.performance.now !== 'function'
) {
  globalThis.performance = {
    now: () => Date.now(),
    mark: () => {},
    clearMarks: () => {},
    measure: () => {},
    clearMeasures: () => {},
  } as any;
}


import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
