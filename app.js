import { detectSensitiveData, privacyMessage } from './privacy-filter.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import {
  generateHebText,
  getLocalAiCapability,
  isLocalAiReady,
  preloadLocalAi,
} from './ai-engine.js';

const appShell = document.querySelector('#appShell');
const startupGate = document.querySelector('#startupGate');
const startupTitle = document.querySelector('#startupTitle');
const startupText = document.querySelector('#startupText');
const startupProgressTrack = document.querySelector('#startupProgressTrack');
const startupProgressBar = document.querySelector('#startupProgressBar');
const startupPercent = document.querySelector('#startupPercent');
const startupStage = document.querySelector('#startupStage');
const startupError = document.querySelector('#startupError');
const startupErrorText = document.querySelector('#startupErrorText');
const startupRetryButton = document.querySelector('#startupRetryButton');

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

const RESULT_SECTIONS = {
  A: [
    ['a)', 'Aktuelle Situation bzw. Problemlage', 'unter Berücksichtigung der Ressourcen'],
    ['b)', 'Einschätzung des Hilfebedarfs', ''],
    ['c)', 'Rahmenziele', 'für den Planungszeitraum'],
    ['d)', 'Geplante Maßnahmen', ''],
  ],
  B: [
    ['a)', 'Reflexion der durchgeführten Maßnahmen', ''],
    ['b)', 'Entwicklung im letzten Planungszeitraum', 'anhand der Rahmenziele und unter Berücksichtigung der Ressourcen'],
    ['c)', 'Einschätzung des Hilfebedarfs', ''],
    ['d)', 'Fortschreibung der Rahmenziele', ''],
    ['e)', 'Geplante Maßnahmen', ''],
  ],
  C: [
    ['a)', 'Reflexion der durchgeführten Maßnahmen', 'im letzten Förderzeitraum'],
    ['b)', 'Entwicklung anhand der Rahmenziele', 'unter Berücksichtigung der Ressourcen'],
    ['c)', 'Noch bestehender Hilfebedarf', ''],
    ['d)', 'Weitere vorgesehene Maßnahmen', ''],
    ['e)', 'Durch wen werden diese Maßnahmen erbracht', ''],
  ],
};

const READY_PLACEHOLDER = notes.getAttribute('placeholder') || '';
const LOADING_PLACEHOLDER = 'Eingabe wird freigeschaltet, sobald die lokale KI vollständig gestartet ist.';

let serviceWorkerRegistration = null;
let aiLoadInProgress = false;
let lastCopyText = '';

function updateFormHint() {
  formHint.textContent = INPUT_HINTS[reportType.value] || HEB_FORM_CONFIG.A.hint;
}

function parseGeneratedSections(text, formType) {
  const defs = RESULT_SECTIONS[formType] || RESULT_SECTIONS.A;
  const parsed = [];

  for (let index = 0; index < defs.length; index += 1) {
    const [letter, title, subtitle] = defs[index];
    const marker = `${letter} ${title}`;
    const start = text.indexOf(marker);
    const nextDef = defs[index + 1];
    const nextMarker = nextDef ? `${nextDef[0]} ${nextDef[1]}` : null;
    const nextStart = nextMarker ? text.indexOf(nextMarker) : -1;

    let body = '';
    if (start >= 0) {
      const bodyStart = start + marker.length;
      body = text.slice(bodyStart, nextStart > bodyStart ? nextStart : text.length).trim();
      if (subtitle && body.toLowerCase().startsWith(subtitle.toLowerCase())) {
        body = body.slice(subtitle.length).trim();
      }
    }

    parsed.push({ letter, title, subtitle, body: body || 'Hierzu liegen keine ausreichenden Angaben vor.' });
  }

  return parsed;
}

function renderHebResult(text) {
  result.replaceChildren();

  const meta = document.createElement('div');
  meta.className = 'heb-result-meta';

  const metaLabel = document.createElement('span');
  metaLabel.className = 'heb-result-meta-label';
  metaLabel.textContent = reportType.options[reportType.selectedIndex]?.textContent || `HEB ${reportType.value}`;

  const metaArea = document.createElement('strong');
  metaArea.className = 'heb-result-meta-area';
  metaArea.textContent = area.value;

  meta.append(metaLabel, metaArea);
  result.append(meta);

  const sections = parseGeneratedSections(text, reportType.value);
  for (const section of sections) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'heb-result-section';

    const head = document.createElement('div');
    head.className = 'heb-result-section-head';

    const letter = document.createElement('span');
    letter.className = 'heb-result-section-letter';
    letter.textContent = section.letter;

    const titles = document.createElement('div');
    titles.className = 'heb-result-section-titles';

    const title = document.createElement('h3');
    title.textContent = section.title;
    titles.append(title);

    if (section.subtitle) {
      const subtitle = document.createElement('span');
      subtitle.textContent = section.subtitle;
      titles.append(subtitle);
    }

    head.append(letter, titles);

    const body = document.createElement('div');
    body.className = 'heb-result-section-body';
    const paragraph = document.createElement('p');
    paragraph.textContent = section.body;
    body.append(paragraph);

    sectionEl.append(head, body);
    result.append(sectionEl);
  }
}

function setResult(text, state = 'ready') {
  result.className = state === 'ready' ? 'result-ready' : state === 'error' ? 'result-error' : 'result-empty';

  if (state === 'ready') {
    renderHebResult(text);
    const formName = reportType.options[reportType.selectedIndex]?.textContent || `HEB ${reportType.value}`;
    lastCopyText = `${formName}\n${area.value}\n\n${text}`.trim();
  } else {
    result.textContent = text;
    lastCopyText = '';
  }

  copyButton.disabled = state !== 'ready' || !text.trim();
}

function setAiInputEnabled(enabled) {
  notes.disabled = !enabled;
  generateButton.disabled = !enabled;
  clearButton.disabled = !enabled;
  notes.placeholder = enabled ? READY_PLACEHOLDER : LOADING_PLACEHOLDER;
}

function showStartupGate() {
  startupGate.classList.remove('startup-gate-hidden');
  startupGate.setAttribute('aria-hidden', 'false');
  startupGate.setAttribute('aria-busy', 'true');
  appShell.setAttribute('inert', '');
  appShell.setAttribute('aria-hidden', 'true');
  document.body.classList.add('startup-locked');
}

function hideStartupGate() {
  startupGate.classList.add('startup-gate-hidden');
  startupGate.setAttribute('aria-hidden', 'true');
  startupGate.setAttribute('aria-busy', 'false');
  appShell.removeAttribute('inert');
  appShell.removeAttribute('aria-hidden');
  document.body.classList.remove('startup-locked');
}

function updateStartupStatus(status = {}, percent = 0) {
  if (status.status === 'generating') return;

  if (status.status === 'ready') {
    startupProgressBar.style.width = '100%';
    startupProgressTrack.setAttribute('aria-valuenow', '100');
    startupPercent.textContent = '100 %';
    startupStage.textContent = 'KI ist bereit';
    startupTitle.textContent = 'Lokale KI ist bereit';
    startupText.textContent = 'HEB Assist kann jetzt verwendet werden.';
    startupError.hidden = true;
    startupRetryButton.hidden = true;
    window.setTimeout(hideStartupGate, 180);
    return;
  }

  showStartupGate();

  if (status.status === 'error') {
    startupTitle.textContent = 'KI konnte nicht gestartet werden';
    startupText.textContent = 'HEB Assist bleibt gesperrt, bis die lokale KI erfolgreich gestartet wurde.';
    startupProgressTrack.hidden = true;
    startupPercent.textContent = '—';
    startupStage.textContent = 'Start fehlgeschlagen';
    startupErrorText.textContent = status.error || 'Unbekannter Fehler beim Start der lokalen KI.';
    startupError.hidden = false;
    startupRetryButton.hidden = false;
    return;
  }

  startupProgressTrack.hidden = false;
  startupProgressBar.style.width = `${Math.max(3, percent)}%`;
  startupProgressTrack.setAttribute('aria-valuenow', String(Math.round(percent)));
  startupPercent.textContent = `${Math.round(percent)} %`;
  startupError.hidden = true;
  startupErrorText.textContent = '';
  startupRetryButton.hidden = true;

  if (status.status === 'loading') {
    const starting = percent >= 97;
    startupTitle.textContent = starting ? 'Lokale KI wird gestartet' : 'Lokale KI wird geladen';
    startupText.textContent = starting
      ? 'Der Download ist abgeschlossen. Das Sprachmodell wird jetzt auf dem Gerät initialisiert.'
      : 'Das Sprachmodell wird direkt auf diesem Gerät vorbereitet.';
    startupStage.textContent = status.text || 'KI-Dateien werden geladen …';
  } else {
    startupTitle.textContent = 'Lokale KI wird vorbereitet';
    startupText.textContent = 'Das Sprachmodell wird direkt auf diesem Gerät gestartet.';
    startupStage.textContent = 'Vorbereitung läuft …';
  }
}

function updateEngineStatus(status = {}) {
  const percent = Number.isFinite(status.percent) ? Math.max(0, Math.min(100, status.percent)) : 0;
  engineProgressBar.style.width = `${Math.max(3, percent)}%`;
  updateStartupStatus(status, percent);

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

  if (status.status === 'generating') {
    setAiInputEnabled(false);
    engineBadge.textContent = 'KI formuliert …';
    engineBadge.classList.add('loading');
    engineProgressTrack.hidden = true;
    engineStatusText.textContent = 'Die lokale KI erstellt den HEB-Entwurf.';
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
    setResult('Die lokale KI ist noch nicht einsatzbereit.', 'error');
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
});

clearButton.addEventListener('click', () => {
  notes.value = '';
  charCount.textContent = '0 / 3500';
  privacyResult.hidden = true;
  setResult('Noch keine Formulierung erstellt.', 'empty');
  if (isLocalAiReady()) notes.focus();
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
    setResult('Die lokale KI ist ausgefallen. Die Eingabe wurde nicht durch einen Ersatzmodus verarbeitet.', 'error');
  } finally {
    generateButton.disabled = !isLocalAiReady();
  }
});

copyButton.addEventListener('click', async () => {
  if (copyButton.disabled || !lastCopyText) return;
  try {
    await navigator.clipboard.writeText(lastCopyText);
    const old = copyButton.textContent;
    copyButton.textContent = 'Kopiert';
    window.setTimeout(() => { copyButton.textContent = old; }, 1200);
  } catch {
    setResult(`${lastCopyText}\n\n(Hinweis: Automatisches Kopieren wurde vom Browser blockiert.)`, 'ready');
  }
});

detailsButton.addEventListener('click', () => detailsDialog.showModal());
engineBadge.addEventListener('click', () => detailsDialog.showModal());
closeDialog.addEventListener('click', () => detailsDialog.close());
retryAiButton.addEventListener('click', () => {
  detailsDialog.close();
  startLocalAi();
});
startupRetryButton.addEventListener('click', startLocalAi);
detailsDialog.addEventListener('click', (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});

window.addEventListener('focus', () => {
  checkForAppUpdate();
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkForAppUpdate();
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
