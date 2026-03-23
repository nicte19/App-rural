(function () {
  const runtimeConfig = window.APP_FIREBASE_CONFIG || {};
  const envLikeConfig = {
    apiKey: window.APP_FIREBASE_API_KEY,
    authDomain: window.APP_FIREBASE_AUTH_DOMAIN,
    projectId: window.APP_FIREBASE_PROJECT_ID,
    storageBucket: window.APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: window.APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: window.APP_FIREBASE_APP_ID,
    measurementId: window.APP_FIREBASE_MEASUREMENT_ID,
  };

  window.APP_FIREBASE_CONFIG = {
    ...Object.fromEntries(Object.entries(envLikeConfig).filter(([, value]) => value)),
    ...runtimeConfig,
  };
})();
