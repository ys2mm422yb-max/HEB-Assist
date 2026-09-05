const BUILD_ID = '2026-09-05-2205';

async function prepareLatestApp() {
  if ('serviceWorker' in navigator) {
    let reloadStarted = false;

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadStarted) return;
      reloadStarted = true;
      window.location.reload();
    });

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
