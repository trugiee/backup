const config = {
  appId: 'com.ggallery.app',
  appName: 'mugna',
  webDir: '../frontend/dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorUpdater: {
      // Self-hosted OTA endpoint on your own backend. Must be HTTPS in production.
      updateUrl:
        process.env.OTA_UPDATE_URL || 'https://mugna.onrender.com/api/app/update',
      // Check on launch, download in the background, apply on the next launch.
      // Instant-apply modes ("always"/"onLaunch") additionally require
      // @capacitor/splash-screen with launchAutoHide: false.
      autoUpdate: 'atBackground',
      responseTimeout: 30,
      appReadyTimeout: 15,
    },
  },
};

module.exports = config;
