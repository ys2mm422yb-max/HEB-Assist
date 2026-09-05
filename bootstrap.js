const BUILD_ID = '2026-09-06-0011';

function startAppWhenVisible() {
  const start = async () => {
    try {
      await import(`./app.js?build=${BUILD_ID}`);
    } catch (error) {
      console.error('HEB Assist app start failed:', error?.message || error);
    }
  };

  if (!document.hidden) {
    void start();
    return;
  }

  const startWhenVisible = () => {
    if (document.hidden) return;
    document.removeEventListener('visibilitychange', startWhenVisible);
    void start();
  };
  document.addEventListener('visibilitychange', startWhenVisible);
}

function prepareServiceWorkerInBackground() {
  if (!('serviceWorker' in navigator)) return;

  // Wichtig: Der Service-Worker-Check darf den ersten App-Start nicht blockieren.
  // Sonst kann iOS minutenlang den statischen 0%-Ladebildschirm zeigen, bis die
  // Registrierung bzw. das Update beendet ist. Die lokale KI muss unabhängig
  // davon sofort starten können.
  navigator.serviceWorker.register('./sw.js', {
    updateViaCache: 'none',
  }).then(async (registration) => {
    try {
      await registration.update();
      if (registration.waiting && navigator.serviceWorker.controller) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    } catch (error) {
      console.warn('Background app update check failed:', error?.message || error);
    }
  }).catch((error) => {
    console.warn('Service Worker registration failed:', error?.message || error);
  });
}

// Die eigentliche App immer zuerst starten. Der Update-Check läuft parallel im
// Hintergrund und darf weder KI-Initialisierung noch Eingaben verzögern.
startAppWhenVisible();
prepareServiceWorkerInBackground();
