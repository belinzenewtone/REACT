const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Enables Android core library desugaring for the app module.
 * The lifeos-sms local Expo module uses java.time APIs that require this.
 */
function withDesugaring(config) {
  return withAppBuildGradle(config, (config) => {
    let buildGradle = config.modResults.contents;

    const correctCompileOptions = `    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
        coreLibraryDesugaringEnabled true
    }\n`;

    const desugarDep = 'coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.4")';

    // Remove any stale compileOptions block that may have the wrong setter name.
    buildGradle = buildGradle.replace(
      /\s*compileOptions\s*\{[\s\S]*?isCoreLibraryDesugaringEnabled[\s\S]*?\}\n?/g,
      '\n'
    );

    // Add the correct compileOptions block if still missing.
    if (!buildGradle.includes('coreLibraryDesugaringEnabled true')) {
      buildGradle = buildGradle.replace(
        /(namespace\s+'[^']+'\s*\n)/,
        `$1${correctCompileOptions}`
      );
    }

    // Add the desugaring dependency if missing.
    if (!buildGradle.includes(desugarDep)) {
      buildGradle = buildGradle.replace(
        /(dependencies\s*\{[\s\S]*?)(implementation\("com\.facebook\.react:react-android"\))/,
        `$1    ${desugarDep}\n    $2`
      );
    }

    config.modResults.contents = buildGradle;
    return config;
  });
}

module.exports = withDesugaring;
