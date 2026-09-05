import { detectSensitiveData, privacyMessage } from './privacy-filter.js';
import { generateHebText, getLocalAiCapability } from './ai-engine.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';

const reportType = document.querySelector('#reportType');
const formHint = document.querySelector('#formHint');
const choiceGrid = document.querySelector('#choiceGrid');
const area = document.querySelector('#area');
const notes = document.querySelector('#notes');
const charCount = document.querySelector('#charCount');
const generateButton = document.querySelector('#generateButton');
const clearButton = document.querySelector('#clearButton');
const copyButton = document.querySelector('#copyButton');
const result = document.querySelector('#result');
const privacyResult = document.querySelector('#privacyResult');
const engineBadge = document.querySelector('#engineBadge');
const progressWrap = document.querySelector('#progressWrap');
const progressBar = document.querySelector('#progressBar');
const progressText = document.querySelector('#progressText');
const detailsButton = document.querySelector('#detailsButton');
const detailsDialog = document.querySelector('#detailsDialog');
const closeDialog = document.querySelector('#closeDialog');

const capability = getLocalAiCapability();
engineBadge.textContent = capability.label;
if (!capability.supported) engineBadge.classList.add('warning');

function selectedMode() {
  return document.querySelector('input[name="mode"]:checked')?.value || 'complete';
}

function renderFormOptions() {
  const config = HEB_FORM_CONFIG[reportType.value] || HEB_FORM_CONFIG.A;
  formHint.textContent = config.hint;
  choiceGrid.replaceChildren();

  config.modes.forEach(([value, label], index) => {
    const wrapper = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'mode';
    input.value = value;
    input.checked = index === 0;
    wrapper.append(input, document.createTextNode(` ${label}`));
    choiceGrid.append(wrapper);
  });
}

function setResult(text, state = 'ready') {
  result.textContent = text;
  result.className = state === 'ready' ? 'result-ready' : state === 'error' ? 'result-error' : 'result-empty';
  copyButton.disabled = state !== 'ready' || !text.trim();
}

function updateProgress({ percent = 0, text = '' } = {}) {
  progressWrap.hidden = false;
  progressBar.style.width = `${Math.max(3, Math.min(100, percent))}%`;
  progressText.textContent = text || 'Lokale KI arbeitet…';
}

function hideProgressSoon() {
  window.setTimeout(() => {
    progressWrap.hidden = true;
    progressBar.style.width = '3%';
  }, 900);
}

function validateInput() {
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

reportType.addEventListener('change', () => {
  renderFormOptions();
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
  notes.focus();
});

generateButton.addEventListener('click', async () => {
  const value = validateInput();
  if (!value) return;

  if (!capability.supported) {
    setResult('Auf diesem Gerät ist die lokale KI aktuell nicht verfügbar, weil WebGPU fehlt. Es wurden keine Falldaten übertragen. Bitte einen aktuellen Browser bzw. ein unterstütztes Gerät verwenden.', 'error');
    return;
  }

  generateButton.disabled = true;
  copyButton.disabled = true;
  setResult('Lokale KI wird vorbereitet …', 'empty');
  updateProgress({ percent: 2, text: 'Lokale KI wird vorbereitet…' });

  try {
    const text = await generateHebText({
      notes: value,
      area: area.value,
      formType: reportType.value,
      mode: selectedMode(),
      onProgress: updateProgress,
    });

    setResult(text, 'ready');
    hideProgressSoon();
  } catch (error) {
    console.error('Local AI error:', error?.message || error);
    setResult('Die lokale KI konnte auf diesem Gerät nicht gestartet werden. Es wurden keine Falldaten an einen KI-Server gesendet. Bitte Browser aktualisieren, ausreichend freien Gerätespeicher sicherstellen und erneut versuchen.', 'error');
    progressText.textContent = 'Lokale KI konnte nicht gestartet werden.';
    progressBar.style.width = '100%';
  } finally {
    generateButton.disabled = false;
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
closeDialog.addEventListener('click', () => detailsDialog.close());
detailsDialog.addEventListener('click', (event) => {
  if (event.target === detailsDialog) detailsDialog.close();
});

renderFormOptions();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service Worker registration failed:', error?.message || error);
    });
  });
}
