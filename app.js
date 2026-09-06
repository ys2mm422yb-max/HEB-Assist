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
    { letter: 'a)', title: 'Aktuelle Situation bzw. Problemlage', subtitle: 'unter Berücksichtigung der Ressourcen' },
    { letter: 'b)', title: 'Einschätzung des Hilfebedarfs', subtitle: '' },
    { letter: 'c)', title: 'Rahmenziele', subtitle: 'für den Planungszeitraum' },
    { letter: 'd)', title: 'Geplante Maßnahmen', subtitle: '' },
  ],
  B: [
    { letter: 'a)', title: 'Reflexion der durchgeführten Maßnahmen', subtitle: '' },
    { letter: 'b)', title: 'Entwicklung im letzten Planungszeitraum', subtitle: 'anhand der Rahmenziele und unter Berücksichtigung der Ressourcen' },
    { letter: 'c)', title: 'Einschätzung des Hilfebedarfs', subtitle: '' },
    { letter: 'd)', title: 'Fortschreibung der Rahmenziele', subtitle: '' },
    { letter: 'e)', title: 'Geplante Maßnahmen', subtitle: '' },
  ],
  C: [
    { letter: 'a)', title: 'Reflexion der durchgeführten Maßnahmen', subtitle: 'im letzten Förderzeitraum' },
    { letter: 'b)', title: 'Entwicklung anhand der Rahmenziele', subtitle: 'unter Berücksichtigung der Ressourcen' },
    { letter: 'c)', title: 'Noch bestehender Hilfebedarf', subtitle: '' },
    { letter: 'd)', title: 'Weitere Maßnahmen', subtitle: '' },
    { letter: 'e)', title: 'Durch wen werden diese Maßnahmen erbracht', subtitle: '' },
  ],
};

const READY_PLACEHOLDER = notes.getAttribute('placeholder') || '';
const LOADING_PLACEHOLDER = 'Eingabe wird freigeschaltet, sobald die lokale KI vollständig gestartet ist.';

let aiLoadInProgress = false;
let lastCopyText = '';
let generationStartedAt = 0;
let generationTimer = null;
let lastGenerationStatus = null;

function updateFormHint() {
  formHint.textContent = INPUT_HINTS[reportType.value] || HEB_FORM_CONFIG.A.hint;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseGeneratedSections(text, formType) {
  const defs = RESULT_SECTIONS[formType] || RESULT_SECTIONS.A;
  const parsed = [];

  for (let index = 0; index < defs.length; index += 1) {
    const def = defs[index];
    const currentPattern = new RegExp(`(?:^|\\n)${escapeRegExp(def.letter)}\\s+`, 'm');
    const currentMatch = currentPattern.exec(text);
    const nextDef = defs[index + 1];
    const nextPattern = nextDef ? new RegExp(`(?:^|\\n)${escapeRegExp(nextDef.letter)}\\s+`, 'm') : null;
    const nextMatch = nextPattern ? nextPattern.exec(text) : null;

    let body = '';
    if (currentMatch) {
      const start = currentMatch.index + currentMatch[0].length;
      const end = nextMatch && nextMatch.index > start ? nextMatch.index : text.length;
      const block = text.slice(start, end).trim();
      const firstLineBreak = block.indexOf('\n');
      body = firstLineBreak >= 0 ? block.slice(firstLineBreak + 1).trim() : '';
    }

    parsed.push({ ...def, body: body || 'Hierzu liegen keine ausreichenden Angaben vor.' });
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

function stopGenerationTimer() {
  if (generationTimer) window.clearInterval(generationTimer);
  generationTimer = null;
  generationStartedAt = 0;
  lastGenerationStatus = null;
}

function formatElapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} min`;
}

function renderGenerationProgress() {
  stopGenerationTimer();
  generationStartedAt = Date.now();
  result.className = 'result-generating';
  result.replaceChildren();
  lastCopyText = '';
  copyButton.disabled = true;

  const wrap = document.createElement('div');
  wrap.className = 'generation-status';

  const icon = document.createElement('div');
  icon.className = 'generation-status-icon';
  icon.setAttribute('aria-hidden', 'true');

  const title = document.createElement('strong');
  title.className = 'generation-status-title';
  title.textContent = 'KI erstellt den HEB-Entwurf';

  const stage = document.createElement('span');
  stage.id = 'generationStage';
  stage.className = 'generation-status-stage';
  stage.textContent = 'Situation wird fachlich analysiert …';

  const track = document.createElement('div');
  track.className = 'generation-activity-track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', 'Lokale KI arbeitet');
  const bar = document.createElement('div');
  bar.className = 'generation-activity-bar';
  track.append(bar);

  const meta = document.createElement('span');
  meta.id = 'generationMeta';
  meta.className = 'generation-status-meta';
  meta.textContent = 'Lokale Verarbeitung · 0 s';

  const hint = document.createElement('span');
  hint.className = 'generation-status-hint';
  hint.textContent = 'Der bewegte Balken zeigt, dass die lokale KI weiterarbeitet. Die Fallbeschreibung bleibt auf diesem Gerät.';

  wrap.append(icon, title, stage, track, meta, hint);
  result.append(wrap);

  generationTimer = window.setInterval(() => {
    const metaEl = document.querySelector('#generationMeta');
    if (!metaEl || !generationStartedAt) return;
    const elapsed = Date.now() - generationStartedAt;
    const activity = lastGenerationStatus?.completionTokens
      ? ` · ${lastGenerationStatus.completionTokens} Tokens`
      : lastGenerationStatus?.generatedChars
        ? ` · Ausgabe aktiv`
        : '';
    metaEl.textContent = `Lokale Verarbeitung · ${formatElapsed(elapsed)}${activity}`;
  }, 1000);
}

function updateGenerationProgress(status = {}) {
  if (status.status !== 'generating') return;
  lastGenerationStatus = status;
  const stage = document.querySelector('#generationStage');
  const meta = document.querySelector('#generationMeta');
  if (stage) stage.textContent = status.text || 'KI arbeitet …';
  if (meta && generationStartedAt) {
    const elapsed = Date.now() - generationStartedAt;
    const activity = status.completionTokens
      ? ` · ${status.completionTokens} Tokens`
      : status.generatedChars
        ? ' · Ausgabe aktiv'
        : '';
    meta.textContent = `Lokale Verarbeitung · ${formatElapsed(elapsed)}${activity}`;
  }
}

function setResult(text, state = 'ready') {
  stopGenerationTimer();
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
    const restartBlocked = status.errorCode === 'PREVIOUS_START_INCOMPLETE';
    startupTitle.textContent = restartBlocked ? 'Automatischer KI-Neustart gestoppt' : 'KI konnte nicht gestartet werden';
    startupText.textContent = restartBlocked
      ? 'Der vorherige Modellstart wurde nicht sauber abgeschlossen. HEB Assist lädt das Modell nicht automatisch erneut.'
      : 'HEB Assist bleibt gesperrt, bis die lokale KI erfolgreich gestartet wurde.';
    startupProgressTrack.hidden = true;
    startupPercent.textContent = '—';
    startupStage.textContent = restartBlocked ? 'Erneuter Download gestoppt' : 'Start fehlgeschlagen';
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
  updateGenerationProgress(status);

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
    engineBadge.textContent = status.errorCode === 'PREVIOUS_START_INCOMPLETE' ? 'KI-Neustart gestoppt' : 'KI nicht verfügbar';
    engineBadge.classList.add('warning');
    engineStatusText.textContent = status.errorCode === 'PREVIOUS_START_INCOMPLETE'
      ? 'Ein vorheriger Modellstart wurde nicht sauber abgeschlossen. Ein automatischer erneuter Download wurde gestoppt.'
      : 'Das lokale Sprachmodell konnte nicht gestartet werden. HEB Assist verarbeitet deshalb keine HEB-Eingaben.';
    engineProgressTrack.hidden = true;
    engineErrorText.textContent = status.error || 'Unbekannter Fehler beim Start der lokalen KI.';
    engineErrorBox.hidden = false;
    retryAiButton.hidden = false;
    setAiInputEnabled(false);
    return;
  }

  if (status.status === 'generating') {
    setAiInputEnabled(false);
    engineBadge.textContent = status.phase === 'writing' ? 'KI formuliert …' : 'KI analysiert …';
    engineBadge.classList.add('loading');
    engineProgressTrack.hidden = true;
    engineStatusText.textContent = status.text || 'Die lokale KI erstellt den HEB-Entwurf.';
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

async function startLocalAi({ force = false } = {}) {
  if (aiLoadInProgress || isLocalAiReady()) return;
  aiLoadInProgress = true;
  updateEngineStatus({ status: 'idle', percent: 0, error: null, errorCode: null });
  try {
    await preloadLocalAi(updateEngineStatus, { force });
  } catch (error) {
    console.warn('Lokale KI konnte nicht gestartet werden:', error?.message || error);
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
    privacyResult.textContent = privacyMessage(findings);
    privacyResult.hidden = false;
    setResult('Die Eingabe wurde aus Datenschutzgründen nicht verarbeitet.', 'error');
    privacyResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return null;
  }

  return value;
}

reportType.addEventListener('change', () => {
  updateFormHint();
  setResult('Noch keine Formulierung erstellt.', 'empty');
});

notes.addEventListener('input', () => {
  charCount.textContent = `${notes.value.length} / 3500`;
  if (!privacyResult.hidden && !detectSensitiveData(notes.value).length) {
    privacyResult.hidden = true;
    privacyResult.textContent = '';
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

  setAiInputEnabled(false);
  copyButton.disabled = true;
  renderGenerationProgress();

  try {
    const aiDraft = await generateHebText({
      notes: value,
      area: area.value,
      formType: reportType.value,
      mode: 'complete',
      onProgress: updateEngineStatus,
    });
    setResult(aiDraft, 'ready');
    updateEngineStatus({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null });
  } catch (error) {
    console.warn('Lokale KI-Generierung fehlgeschlagen:', error?.message || error);
    stopGenerationTimer();

    if (isLocalAiReady()) {
      updateEngineStatus({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null });
      const qualityRejected = error?.code === 'QUALITY_REJECTED';
      const timedOut = error?.code === 'GENERATION_TIMEOUT';
      setResult(
        timedOut
          ? 'Die lokale KI hat die maximale Bearbeitungszeit überschritten. Es wurde kein Ersatztext erzeugt.'
          : qualityRejected
            ? 'Der erzeugte Text hat die Qualitätsprüfung nicht bestanden und wurde verworfen. Es wurde kein Ersatztext erzeugt.'
            : 'Beim Formulieren ist ein technischer Fehler aufgetreten. Die lokale KI bleibt geladen; es wurde kein Ersatztext erzeugt.',
        'error',
      );
    } else {
      updateEngineStatus({
        status: 'error',
        percent: 0,
        text: 'KI nicht verfügbar',
        error: error?.message || String(error),
        errorCode: error?.code || null,
      });
      setResult('Die lokale KI konnte während der Verarbeitung nicht weiterarbeiten. Die Eingabe wurde nicht durch einen Ersatzmodus verarbeitet.', 'error');
    }
  } finally {
    setAiInputEnabled(isLocalAiReady());
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
  void startLocalAi({ force: true });
});
startupRetryButton.addEventListener('click', () => void startLocalAi({ force: true }));
detailsDialog.addEventListener('click', (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});

updateFormHint();
setAiInputEnabled(false);
updateEngineStatus({ status: 'idle', percent: 0 });

const capability = getLocalAiCapability();
if (!capability.supported) {
  updateEngineStatus({
    status: 'error',
    percent: 0,
    error: 'Dieses Gerät bzw. dieser Browser stellt WebGPU aktuell nicht bereit.',
    errorCode: 'WEBGPU_UNAVAILABLE',
  });
} else {
  window.setTimeout(() => void startLocalAi(), 250);
}
