const BUILD_ID = '2026-09-06-v12';

let serviceWorkerRegistration = null;
let aiModule = null;
let aiStartupPromise = null;

function getStartupElements() {
  return {
    gate: document.querySelector('#startupGate'),
    title: document.querySelector('#startupTitle'),
    text: document.querySelector('#startupText'),
    track: document.querySelector('#startupProgressTrack'),
    bar: document.querySelector('#startupProgressBar'),
    percent: document.querySelector('#startupPercent'),
    stage: document.querySelector('#startupStage'),
    error: document.querySelector('#startupError'),
    errorText: document.querySelector('#startupErrorText'),
    appShell: document.querySelector('#appShell'),
  };
}

function updateEarlyStartupUi(status = {}) {
  const ui = getStartupElements();
  if (!ui.gate) return;
  const percent = Number.isFinite(status.percent) ? Math.max(0, Math.min(100, Math.round(status.percent))) : 0;
  if (status.status === 'error') {
    const restartBlocked = status.errorCode === 'PREVIOUS_START_INCOMPLETE';
    ui.title.textContent = restartBlocked ? 'Automatischer KI-Neustart gestoppt' : 'KI konnte nicht gestartet werden';
    ui.text.textContent = restartBlocked
      ? 'Der vorherige Modellstart wurde nicht sauber abgeschlossen. HEB Assist lädt das Modell nicht automatisch erneut.'
      : 'HEB Assist bleibt gesperrt, bis die lokale KI erfolgreich gestartet wurde.';
    ui.percent.textContent = '—';
    ui.stage.textContent = restartBlocked ? 'Erneuter Download gestoppt' : 'Start fehlgeschlagen';
    ui.track.hidden = true;
    if (ui.error && ui.errorText) { ui.error.hidden = false; ui.errorText.textContent = status.error || 'Unbekannter Fehler beim Start der lokalen KI.'; }
    return;
  }
  if (status.status === 'ready') {
    ui.bar.style.width = '100%'; ui.track.setAttribute('aria-valuenow', '100'); ui.percent.textContent = '100 %'; ui.stage.textContent = 'KI ist bereit'; ui.title.textContent = 'Lokale KI ist bereit'; ui.text.textContent = 'HEB Assist kann jetzt verwendet werden.'; return;
  }
  if (status.status === 'loading') {
    ui.bar.style.width = `${Math.max(3, percent)}%`; ui.track.setAttribute('aria-valuenow', String(percent)); ui.percent.textContent = `${percent} %`; ui.stage.textContent = status.text || 'Sprachmodell wird vorbereitet …'; ui.title.textContent = percent >= 97 ? 'Lokale KI wird gestartet' : 'Lokale KI wird geladen'; ui.text.textContent = percent >= 97 ? 'Das Sprachmodell wird jetzt auf diesem Gerät initialisiert.' : 'Das Sprachmodell wird direkt auf diesem Gerät vorbereitet.';
  }
}

function finishReadyUiIfNeeded() {
  if (!aiModule?.isLocalAiReady?.()) return;
  const gate = document.querySelector('#startupGate'); const appShell = document.querySelector('#appShell'); const notes = document.querySelector('#notes'); const generateButton = document.querySelector('#generateButton'); const clearButton = document.querySelector('#clearButton'); const engineBadge = document.querySelector('#engineBadge'); const engineProgressTrack = document.querySelector('#engineProgressTrack');
  gate?.classList.add('startup-gate-hidden'); gate?.setAttribute('aria-hidden', 'true'); gate?.setAttribute('aria-busy', 'false'); appShell?.removeAttribute('inert'); appShell?.removeAttribute('aria-hidden'); document.body.classList.remove('startup-locked');
  if (notes) notes.disabled = false; if (generateButton) generateButton.disabled = false; if (clearButton) clearButton.disabled = false;
  if (engineBadge) { engineBadge.textContent = 'KI ist bereit ✓'; engineBadge.classList.remove('loading', 'warning'); engineBadge.classList.add('ready'); }
  if (engineProgressTrack) engineProgressTrack.hidden = true;
}

async function startLocalAiImmediately() {
  if (aiStartupPromise) return aiStartupPromise;
  aiStartupPromise = (async () => { aiModule = await import('./ai-engine.js'); const capability = aiModule.getLocalAiCapability?.(); if (!capability?.supported) return; await aiModule.preloadLocalAi(updateEarlyStartupUi); })().catch((error) => { updateEarlyStartupUi({ status: 'error', percent: 0, error: error?.message || String(error), errorCode: error?.code || null }); throw error; });
  return aiStartupPromise;
}

function waitForInitialPageLoad() {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
}

async function startApp() {
  const aiPromise = startLocalAiImmediately();
  await waitForInitialPageLoad();
  try { await import(`./app.js?build=${BUILD_ID}`); finishReadyUiIfNeeded(); } catch (error) { console.error('HEB Assist app start failed:', error?.message || error); }
  try { await aiPromise; finishReadyUiIfNeeded(); } catch { /* sichtbarer Ladebildschirm enthält den Fehler */ }
}

async function checkForAppUpdate() {
  if (!serviceWorkerRegistration || !navigator.onLine) return;
  try { await serviceWorkerRegistration.update(); if (serviceWorkerRegistration.waiting && navigator.serviceWorker.controller) serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (error) { console.warn('Automatische Update-Prüfung fehlgeschlagen:', error?.message || error); }
}

async function prepareServiceWorkerAfterAiStart() {
  if (!('serviceWorker' in navigator)) return;
  try { await aiStartupPromise?.catch(() => undefined); serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }); await checkForAppUpdate(); } catch (error) { console.warn('Service Worker konnte nicht vorbereitet werden:', error?.message || error); }
}

void startApp().finally(() => { void prepareServiceWorkerAfterAiStart(); });
window.addEventListener('focus', () => { void checkForAppUpdate(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) void checkForAppUpdate(); });
window.setInterval(() => { if (!document.hidden) void checkForAppUpdate(); }, 5 * 60 * 1000);
