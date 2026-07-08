const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Disable Android auto-backup for this app so a "Clear storage" actually wipes
 * the local SQLite DB. Without this, Google/Android restores `lifeos.db` after
 * the user clears data, and every SMS import sees the previous import as
 * duplicates.
 */
module.exports = function withAllowBackup(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$['android:allowBackup'] = 'false';
      // Also opt out of Google’s automatic restore on install.
      application.$['android:fullBackupOnly'] = 'false';
    }
    return config;
  });
};
