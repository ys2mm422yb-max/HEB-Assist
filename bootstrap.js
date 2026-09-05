const BUILD_ID = '2026-09-05-2312';

async function prepareLatestApp() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js', {
        updateViaCache: 'none',
      });

      await registration.update();

      if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.warn('Early app update check failed:', error?.message || error);
    }
  }

  // Never force-reload an already opened HEB Assist session here. A model
  // download or an active draft must not be discarded just because a newer
  // service worker becomes active. Fresh app code is picked up automatically
  // on the next normal opening of the app.
  if (!document.hidden) {
    await import(`./app.js?build=${BUILD_ID}`);
  } else {
    const startWhenVisible = async () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', startWhenVisible);
      await import(`./app.js?build=${BUILD_ID}`);
    };
    document.addEventListener('visibilitychange', startWhenVisible);
  }
}

prepareLatestApp();
