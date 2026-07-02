const { withAppBuildGradle } = require('@expo/config-plugins');

function withCoreLibraryDesugaring(config) {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (!contents.includes('coreLibraryDesugaringEnabled true')) {
      contents = contents.replace(
        /compileOptions\s*\{/,
        'compileOptions {\n        coreLibraryDesugaringEnabled true',
      );
    }

    if (!contents.includes('desugar_jdk_libs')) {
      contents = contents.replace(
        /dependencies\s*\{/,
        'dependencies {\n    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.0.4")',
      );
    }

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withCoreLibraryDesugaring;
