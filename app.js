import { detectSensitiveData, privacyMessage } from './privacy-filter.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import { formulateHebDraft } from './fast-formulator.js';

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

const INPUT_HINTS = {
  A: 'Beschreibe einfach, was aktuell gelingt, wo Unterstützung nötig ist und was ihr konkret macht. HEB Assist erstellt die passenden Punkte automatisch.',
  B: 'Beschreibe kurz: Was wurde gemacht? Was hat sich im letzten Zeitraum verändert? Was gelingt aktuell? Wobei wird weiter Unterstützung benötigt? Was soll weitergeführt werden?',
  C: 'Beschreibe kurz: Was wurde gemacht? Wie hat sich die Person entwickelt? Welcher Hilfebedarf besteht noch? Was ist nach Abschluss vorgesehen und – falls bekannt – durch wen?',
};

function updateFormHint() {
  formHint.textContent = INPUT_HINTS[reportType.value] || HEB_FORM_CONFIG.A.hint;
}

function setResult(text, state = 'ready') {
  result.textContent = text;
  result.className = state === 'ready' ? 'result-ready' : state === 'error' ? 'result-error' : 'result-empty';
  copyButton.disabled = state !== 'ready' || !text.trim();
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
  notes.focus();
});

generateButton.addEventListener('click', () => {
  const value = validateInput();
  if (!value) return;

  generateButton.disabled = true;
  copyButton.disabled = true;

  try {
    const draft = formulateHebDraft({
      notes: value,
      area: area.value,
      formType: reportType.value,
    });
    setResult(draft, 'ready');
  } catch (error) {
    console.error('HEB draft error:', error?.message || error);
    setResult('Die Formulierung konnte nicht erstellt werden. Bitte Eingabe prüfen und erneut versuchen.', 'error');
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

updateFormHint();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service Worker registration failed:', error?.message || error);
    });
  });
}
