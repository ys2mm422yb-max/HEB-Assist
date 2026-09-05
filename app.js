import { detectSensitiveData, privacyMessage } from './privacy-filter.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import {
  generateHebText,
  getLocalAiCapability,
  isLocalAiReady,
  preloadLocalAi,
} from './ai-engine.js';

const reportType = document.querySelector('#reportType');
const formHint = document.querySelector('#formHint');
const area = document.querySelector('#area');
const notes = document.querySelector('#notes');
const charCount = document.querySelector('#charCount');
const generateButton = document.querySelector('#generateButton');
const clearButton = document.querySelector('#clearButton');
const copyButton = document.querySelector('#copyButton');
const result = document.querySelector('#result');
const privacyResult = document.querySelector('#privacyResult');
const detailsButton = document.querySelector('#detailsButton');
const detailsDialog = document.querySelector('#detailsDialog');
const closeDialog = document.querySelector('#closeDialog');
const retryAiButton = document.querySelector('#retryAiButton');
const engineBadge = document.querySelector('#engineBadge');
const engineStatusText = document.querySelector('#engineStatusText');
const engineProgressBar = document.querySelector('#engineProgressBar');
const engineProgressTrack = document.querySelector('#engineProgressTrack');
const engineErrorBox = document.querySelector('#engineErrorBox');
const engineErrorText = document.querySelector('#engineErrorText');

const INPUT_HINTS = {
  A: 'Beschreibe einfach, was aktuell gelingt, wo Unterstützung nötig ist und was ihr konkret macht. HEB Assist erstellt die passenden Punkte automatisch.',
  B: 'Beschreibe kurz: Was wurde gemacht? Was hat sich im letzten Zeitraum verändert? Was gelingt aktuell? Wobei wird weiter Unterstützung benötigt? Was soll weitergeführt werden?',
  C: 'Beschreibe kurz: Was wurde gemacht? Wie hat sich die Person entwickelt? Welcher Hilfebedarf besteht noch? Was ist nach Abschluss vorgesehen und – falls bekannt – durch wen?',
};

const READY_PLACEHOLDER = notes.getAttribute('placeholder') || '';
const LOADING_PLACEHOLDER = 'Eingabe wird freigeschaltet, sobald die lokale KI vollständig gestartet ist.';

let serviceWorkerRegistration = null;
let pendingAppReload = false;
let updateReloadStarted = false;
let aiLoadInProgress = false;

function updateFormHint() {
  formHint.textContent = INPUT_HINTS[reportType.value] || HEB_FORM_CONFIG.A.hint;
}

function setResult(text, state = 'ready') {
  result.textContent = text;
  result.className = state === 'ready' ? 'result-ready' : state === 'error' ? 'result-error' : 'result-empty';
  copyButton.disabled = state !== 'ready' || !text.trim();
}

function setAiInputEnabled(enabled) {
  notes.disabled = !enabled;
  generateButton.disabled = !enabled;
  clearButton.disabled = !enabled;
  notes.placeholder = enabled ? READY_PLACEHOLDER : LOADING_PLACEHOLDER;
}

function updateEngineStatus(status = {}) {
  const percent = Number.isFinite(status.percent) ? Math.max(0, Math.min(100, status.percent)) : 0;
  engineProgressBar.style.width = `${Math.max(3, percent)}%`;

  engineBadge.classList.remove('loading', 'ready', 'warning');

  if (status.status === 'ready') {
    engineBadge.textContent = 'KI ist bereit ✓';
    engineBadge.classList.add('ready');
    engineStatusText.textContent = 'Das lokale Sprachmodell ist vollständig gestartet. HEB-Eingaben können jetzt verarbeitet werden.';
    engineProgressTrack.hidden = true;
    engineErrorBox.hidden = true;
    engineErrorText.textContent = '';
    retryAiButton.hidden = true;
    setAiInputEnabled(true);
    return;
  }

  if (status.status === 'error') {
    engineBadge.textContent = 'KI nicht verfügbar';
    engineBadge.classList.add('warning');
    engineStatusText.textContent = 'Das lokale Sprachmodell konnte nicht gestartet werden. HEB Assist verarbeitet deshalb keine HEB-Eingaben.';
    engineProgressTrack.hidden = true;
    engineErrorText.textContent = status.error || 'Unbekannter Fehler beim Start der lokalen KI.';
    engineErrorBox.hidden = false;
    retryAiButton.hidden = false;
    setAiInputEnabled(false);
    return;
  }

  setAiInputEnabled(false);
  engineBadge.classList.add('loading');
  engineProgressTrack.hidden = false;
  engineErrorBox.hidden = true;
  engineErrorText.textContent = '';
  retryAiButton.hidden = true;

  if (status.status === 'loading') {
    engineBadge.textContent = percent > 0 ? `KI lädt · ${Math.round(percent)}%` : 'KI wird geladen …';
    engineStatusText.textContent = status.text || 'Das lokale Sprachmodell wird geladen. Die Eingabe bleibt bis zum vollständigen Start gesperrt.';
  } else if (status.status === 'generating') {
    engineBadge.textContent = 'KI formuliert …';
    engineProgressTrack.hidden = true;
    engineStatusText.textContent = 'Die lokale KI erstellt den HEB-Entwurf.';
  } else {
    engineBadge.textContent = 'KI wird vorbereitet …';
    engineStatusText.textContent = 'Das lokale Sprachmodell wird automatisch vorbereitet. Die Eingabe bleibt bis zum vollständigen Start gesperrt.';
  }
}

async function startLocalAi() {
  if (aiLoadInProgress || isLocalAiReady()) return;
  aiLoadInProgress = true;
  updateEngineStatus({ status: 'idle', percent: 0, error: null });
  try {
    await preloadLocalAi(updateEngineStatus);
  } catch (error) {
    console.warn('Local AI start failed:', error?.message || error);
  } finally {
    aiLoadInProgress = false;
  }
}

function validateInput() {
  if (!isLocalAiReady()) {
    setResult('Die lokale KI ist noch nicht einsatzbereit. Bitte warte, bis oben rechts „KI ist bereit ✓“ angezeigt wird.', 'error');
    return null;
  }

  const value = notes.value.trim();
  privacyResult.hidden = true;
  privacyResult.textContent = '';

  if (value.length < 12) {
    setResult('Bitte beschreibe die Situation etwas genauer.', 'error');
    return null;
  }

  const findings = detectSensitiveData(value);
  if (findings.length) {
    const message = privacyMessage(findings);
    privacyResult.textContent = message;
    privacyResult.hidden = false;
    setResult('Die Eingabe wurde aus Datenschutzgründen nicht verarbeitet.', 'error');
    privacyResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return null;
  }

  return value;
}

function hasActiveWork() {
  return notes.value.trim().length > 0 || !copyButton.disabled;
}

function maybeReloadForUpdate() {
  if (!pendingAppReload || updateReloadStarted || hasActiveWork()) return;
  updateReloadStarted = true;
  window.location.reload();
}

async function checkForAppUpdate() {
  if (!serviceWorkerRegistration || !navigator.onLine) return;
  try {
    await serviceWorkerRegistration.update();
    if (serviceWorkerRegistration.waiting) {
      serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  } catch (error) {
    console.warn('Automatic app update check failed:', error?.message || error);
  }
}

async function setupAutomaticAppUpdates() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updateReloadStarted) return;
    pendingAppReload = true;
    maybeReloadForUpdate();
  });

  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js', {
      updateViaCache: 'none',
    });

    serviceWorkerRegistration.addEventListener('updatefound', () => {
      const installingWorker = serviceWorkerRegistration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          installingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });

    await checkForAppUpdate();
  } catch (error) {
    console.warn('Service Worker registration failed:', error?.message || error);
  }
}

reportType.addEventListener('change', () => {
  updateFormHint();
  setResult('Noch keine Formulierung erstellt.', 'empty');
});

notes.addEventListener('input', () => {
  charCount.textContent = `${notes.value.length} / 3500`;
  if (!privacyResult.hidden) {
    const findings = detectSensitiveData(notes.value);
    if (!findings.length) {
      privacyResult.hidden = true;
      privacyResult.textContent = '';
    }
  }
  maybeReloadForUpdate();
});

clearButton.addEventListener('click', () => {
  notes.value = '';
  charCount.textContent = '0 / 3500';
  privacyResult.hidden = true;
  setResult('Noch keine Formulierung erstellt.', 'empty');
  maybeReloadForUpdate();
  if (!pendingAppReload && isLocalAiReady()) notes.focus();
});

generateButton.addEventListener('click', async () => {
  const value = validateInput();
  if (!value) return;

  generateButton.disabled = true;
  copyButton.disabled = true;
  setResult('KI formuliert den HEB-Entwurf …', 'empty');

  try {
    const aiDraft = await generateHebText({
      notes: value,
      area: area.value,
      formType: reportType.value,
      mode: 'complete',
      onProgress: updateEngineStatus,
    });
    setResult(aiDraft, 'ready');
    updateEngineStatus({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null });
  } catch (error) {
    console.warn('Local AI generation failed:', error?.message || error);
    updateEngineStatus({
      status: 'error',
      percent: 0,
      text: 'KI nicht verfügbar',
      error: error?.message || String(error),
    });
    setResult('Die lokale KI ist ausgefallen. Die Eingabe wurde nicht durch einen Ersatzmodus verarbeitet. Öffne „Technik & Datenschutz“ für die technische Fehlermeldung und versuche anschließend „KI erneut starten“.', 'error');
  } finally {
    generateButton.disabled = !isLocalAiReady();
  }
});

copyButton.addEventListener('click', async () => {
  if (copyButton.disabled) return;
  try {
    await navigator.clipboard.writeText(result.textContent);
    const old = copyButton.textContent;
    copyButton.textContent = 'Kopiert';
    window.setTimeout(() => { copyButton.textContent = old; }, 1200);
  } catch {
    setResult(`${result.textContent}\n\n(Hinweis: Automatisches Kopieren wurde vom Browser blockiert.)`, 'ready');
  }
});

detailsButton.addEventListener('click', () => detailsDialog.showModal());
engineBadge.addEventListener('click', () => detailsDialog.showModal());
closeDialog.addEventListener('click', () => detailsDialog.close());
retryAiButton.addEventListener('click', () => {
  detailsDialog.close();
  startLocalAi();
});
detailsDialog.addEventListener('click', (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});

window.addEventListener('focus', () => {
  checkForAppUpdate();
  maybeReloadForUpdate();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    checkForAppUpdate();
    maybeReloadForUpdate();
  }
});

window.setInterval(() => {
  if (!document.hidden) checkForAppUpdate();
}, 5 * 60 * 1000);

updateFormHint();
setAiInputEnabled(false);
updateEngineStatus({ status: 'idle', percent: 0 });

const capability = getLocalAiCapability();
if (!capability.supported) {
  updateEngineStatus({
    status: 'error',
    percent: 0,
    error: 'Dieses Gerät bzw. dieser Browser stellt WebGPU aktuell nicht bereit.',
  });
} else {
  window.setTimeout(startLocalAi, 500);
}

window.addEventListener('load', setupAutomaticAppUpdates);
