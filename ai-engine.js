import { HEB_FORM_CONFIG, getOutputInstruction } from './heb-knowledge.js';

const GEMMA_WEBGPU_URL = 'https://cdn.jsdelivr.net/npm/gemma-webgpu@0.1.0/dist/index.js';
const MODEL_KEY = '270m';
const MODEL_LABEL = 'Gemma 3 270M Q8_0';
const CONTEXT_LENGTH = 1024;

const CORE_RULES = `Du bist HEB Assist, ein fachlicher Formulierungsassistent für die sozialpsychiatrische Eingliederungshilfe.
Verbindlich:
- Nutze ausschließlich Angaben aus der Fallbeschreibung. Nichts erfinden oder ergänzen.
- Keine Diagnose, Symptome, Risiken, Fähigkeiten, Ressourcen, Entwicklung, Ziele, Maßnahmen oder Hilfebedarfe behaupten, die nicht aus der Eingabe hervorgehen.
- Schreibe wertschätzend, sachlich, ressourcenorientiert und in gut verständlichem Deutsch.
- Verwende keine Namen; schreibe „die leistungsberechtigte Person“ oder „die Person“.
- Selbstaussage, Beobachtung und fachliche Einschätzung nicht vermischen.
- Unterstützungsbedarf konkret und wertfrei beschreiben.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt wurde.
- HEB-Bogentyp, Bereich und Unterpunkte exakt beachten.
- Wenn eine nötige Angabe fehlt, sage knapp, dass hierzu keine ausreichende Angabe vorliegt, statt etwas zu erfinden.`;

const OUTPUT_STRUCTURES = {
  A: `a) Aktuelle Situation bzw. Problemlage unter Berücksichtigung der Ressourcen\nb) Einschätzung des Hilfebedarfs\nc) Rahmenziele\nd) Geplante Maßnahmen`,
  B: `a) Reflexion der durchgeführten Maßnahmen\nb) Entwicklung im Planungszeitraum unter Berücksichtigung der Ressourcen\nc) Einschätzung des Hilfebedarfs\nd) Fortschreibung der Rahmenziele\ne) Geplante Maßnahmen`,
  C: `a) Reflexion der durchgeführten Maßnahmen\nb) Entwicklung unter Berücksichtigung der Ressourcen\nc) Noch bestehender Hilfebedarf\nd) Weitere Maßnahmen\ne) Durch wen werden Maßnahmen erbracht`,
};

let enginePromise = null;
let engineInstance = null;
let modelInfo = null;
let modelState = {
  status: 'idle',
  percent: 0,
  text: 'KI wird vorbereitet …',
  error: null,
};

function setModelState(next, onProgress) {
  modelState = { ...modelState, ...next };
  onProgress?.({ ...modelState });
}

export function getLocalAiCapability() {
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
  return {
    hasWebGPU,
    supported: hasWebGPU,
    modelProfile: 'streaming-webgpu',
    modelLabel: MODEL_LABEL,
    runtime: 'gemma-webgpu',
    label: hasWebGPU ? 'Lokale KI verfügbar' : 'Lokale KI nicht verfügbar',
  };
}

export function getLocalAiStatus() {
  return { ...modelState };
}

export function isLocalAiReady() {
  return Boolean(engineInstance);
}

function mapLoadProgress(progress, onProgress) {
  const loaded = Number(progress?.loaded || 0);
  const total = Number(progress?.total || 0);
  const rawPercent = total > 0 ? Math.round((loaded / total) * 100) : 0;
  const percent = total > 0 ? Math.min(96, Math.max(4, rawPercent)) : 4;
  const statusText = progress?.status || 'Sprachmodell wird geladen …';

  setModelState({
    status: 'loading',
    percent,
    text: statusText,
    error: null,
  }, onProgress);
}

async function loadEngine(onProgress) {
  if (engineInstance) {
    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    return engineInstance;
  }

  if (!getLocalAiCapability().supported) {
    const error = new Error('Dieses Gerät bzw. dieser Browser stellt WebGPU aktuell nicht bereit.');
    setModelState({ status: 'error', percent: 0, text: 'KI nicht verfügbar', error: error.message }, onProgress);
    throw error;
  }

  if (!enginePromise) {
    enginePromise = (async () => {
      setModelState({
        status: 'loading',
        percent: 3,
        text: 'Speicherschonende KI-Laufzeit wird geladen …',
        error: null,
      }, onProgress);

      const { createGemmaEngine } = await import(GEMMA_WEBGPU_URL);

      setModelState({
        status: 'loading',
        percent: 4,
        text: 'Sprachmodell wird in kleinen Abschnitten geladen …',
        error: null,
      }, onProgress);

      const engine = await createGemmaEngine({
        model: MODEL_KEY,
        contextLength: CONTEXT_LENGTH,
        onProgress: (progress) => mapLoadProgress(progress, onProgress),
      });

      engineInstance = engine;
      modelInfo = {
        id: MODEL_KEY,
        label: MODEL_LABEL,
        profile: 'streaming-webgpu',
        device: 'webgpu',
        runtimeLabel: 'gemma-webgpu 0.1.0',
        contextLength: CONTEXT_LENGTH,
      };

      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
      return engine;
    })().catch((error) => {
      enginePromise = null;
      engineInstance = null;
      const message = error?.message || String(error);
      setModelState({
        status: 'error',
        percent: 0,
        text: 'KI nicht verfügbar',
        error: message,
      }, onProgress);
      throw error;
    });
  } else {
    onProgress?.({ ...modelState });
  }

  return enginePromise;
}

export function preloadLocalAi(onProgress) {
  return loadEngine(onProgress);
}

function buildPrompt({ notes, area, formType, mode }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const instruction = getOutputInstruction(formType, mode);
  const structure = OUTPUT_STRUCTURES[formType] || OUTPUT_STRUCTURES.A;

  return `${CORE_RULES}\n\nHEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\n\nAufgabe:\n${instruction}\n\nVerwende genau diese Gliederung:\n${structure}\n\nFallbeschreibung:\n${notes}\n\nGib ausschließlich den fertigen HEB-Entwurf aus. Keine Vorbemerkung, keine Diagnose und keine zusätzlichen Tatsachen.`;
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  const engine = await loadEngine(onProgress);
  const prompt = buildPrompt({ notes, area, formType, mode });

  setModelState({ status: 'generating', percent: 100, text: 'KI formuliert …', error: null }, onProgress);

  engine.resetConversation();
  engine.addUserMessage(prompt);

  let text = '';
  try {
    for await (const token of engine.generate({
      temperature: 0,
      topP: 1,
      repPenalty: 1.08,
      maxTokens: 240,
    })) {
      text += token;
    }
  } finally {
    engine.resetConversation();
  }

  const cleaned = text.trim();
  if (!cleaned) {
    throw new Error('Die lokale KI hat kein verwertbares Ergebnis geliefert.');
  }

  setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
  return cleaned;
}

export function getModelInfo() {
  return modelInfo;
}
