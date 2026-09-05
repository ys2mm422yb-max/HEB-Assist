import { HEB_FORM_CONFIG, getOutputInstruction } from './heb-knowledge.js';

const GEMMA_WEBGPU_URL = 'https://cdn.jsdelivr.net/npm/gemma-webgpu@0.1.0/dist/index.js';
const IS_IOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/i.test(navigator.userAgent || '') ||
  (navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1)
);
const MODEL_KEY = IS_IOS ? '270m' : '1b';
const MODEL_LABEL = IS_IOS ? 'Gemma 3 270M Q8_0' : 'Gemma 3 1B Q8_0';
const MODEL_PROFILE = IS_IOS ? 'streaming-webgpu-ios-270m' : 'streaming-webgpu-1b';
const CONTEXT_LENGTH = 1024;

const CORE_RULES = `Du bist HEB Assist, ein fachlicher Formulierungsassistent für die sozialpsychiatrische Eingliederungshilfe.
Regeln:
- Nutze ausschließlich Angaben aus der Fallbeschreibung. Nichts erfinden oder ergänzen.
- Keine Diagnose, Symptome, Risiken, Fähigkeiten, Ressourcen, Entwicklung, Ziele, Maßnahmen oder Hilfebedarfe behaupten, die nicht aus der Eingabe hervorgehen.
- Schreibe sachlich, wertschätzend, ressourcenorientiert und in professionellem, gut verständlichem Deutsch.
- Verwende keine Namen; schreibe „die leistungsberechtigte Person“ oder „die Person“.
- Selbstaussage, Beobachtung und fachliche Einschätzung nicht vermischen.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt wurde.
- Wenn für den verlangten Unterpunkt Angaben fehlen, schreibe knapp: „Hierzu liegen keine ausreichenden Angaben vor.“`;

const IOS_RULES = `Formuliere einen kurzen fachlichen HEB-Text in gutem Deutsch.
Regeln:
- Nur Tatsachen aus der Fallbeschreibung verwenden. Nichts erfinden.
- Keine Diagnose, Ursache, Fähigkeit, Ziel oder Maßnahme ergänzen, die nicht genannt ist.
- Sachlich, wertschätzend und ressourcenorientiert schreiben.
- Wenn Angaben für den verlangten Unterpunkt fehlen, antworte exakt: „Hierzu liegen keine ausreichenden Angaben vor.“`;

const SECTION_MODES = {
  A: [
    ['current', 'a) Aktuelle Situation bzw. Problemlage unter Berücksichtigung der Ressourcen'],
    ['support', 'b) Einschätzung des Hilfebedarfs'],
    ['goals', 'c) Rahmenziele'],
    ['measures', 'd) Geplante Maßnahmen'],
  ],
  B: [
    ['reflection', 'a) Reflexion der durchgeführten Maßnahmen'],
    ['development', 'b) Entwicklung im Planungszeitraum unter Berücksichtigung der Ressourcen'],
    ['support', 'c) Einschätzung des Hilfebedarfs'],
    ['goals', 'd) Fortschreibung der Rahmenziele'],
    ['measures', 'e) Geplante Maßnahmen'],
  ],
  C: [
    ['reflection', 'a) Reflexion der durchgeführten Maßnahmen'],
    ['development', 'b) Entwicklung unter Berücksichtigung der Ressourcen'],
    ['remainingSupport', 'c) Noch bestehender Hilfebedarf'],
    ['furtherMeasures', 'd) Weitere Maßnahmen'],
    ['provider', 'e) Durch wen werden Maßnahmen erbracht'],
  ],
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
    modelProfile: MODEL_PROFILE,
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
        text: IS_IOS
          ? 'Für iPhone/iPad wird das speicherschonende mobile Sprachmodell vorbereitet …'
          : 'Stärkeres lokales Sprachmodell wird vorbereitet …',
        error: null,
      }, onProgress);

      const { createGemmaEngine } = await import(GEMMA_WEBGPU_URL);

      setModelState({
        status: 'loading',
        percent: 4,
        text: `${MODEL_LABEL} wird in Abschnitten geladen …`,
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
        profile: MODEL_PROFILE,
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

function buildSectionPrompt({ notes, area, formType, sectionMode, sectionLabel }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const instruction = getOutputInstruction(formType, sectionMode);
  const rules = IS_IOS ? IOS_RULES : CORE_RULES;

  return `${rules}\n\nHEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nAufgabe:\n${instruction}\n\nFallbeschreibung:\n${notes}\n\nSchreibe nur den Inhalt dieses einen Unterpunkts, ohne Überschrift. Maximal ${IS_IOS ? 2 : 3} Sätze. Keine Vorbemerkung und keine Wiederholungen.`;
}

function normalizeOutput(text) {
  return text
    .replace(/<start_of_turn>|<end_of_turn>|<bos>|<eos>/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isDegenerateOutput(text) {
  const cleaned = normalizeOutput(text);
  if (!cleaned) return true;

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  const lineCounts = new Map();
  for (const line of lines) lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
  if ([...lineCounts.values()].some((count) => count >= 3)) return true;

  const words = cleaned.toLowerCase().match(/[a-zäöüß0-9-]+/g) || [];
  if (words.length >= 12) {
    const counts = new Map();
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
    const mostCommon = Math.max(...counts.values());
    const uniqueRatio = counts.size / words.length;
    if (mostCommon >= 6 || uniqueRatio < 0.34) return true;
  }

  return false;
}

async function runSection(engine, prompt, options) {
  engine.resetConversation();
  engine.addUserMessage(prompt);

  let text = '';
  try {
    for await (const token of engine.generate(options)) text += token;
  } finally {
    engine.resetConversation();
  }

  return normalizeOutput(text);
}

async function generateSection(engine, prompt) {
  let text = await runSection(engine, prompt, {
    temperature: IS_IOS ? 0.2 : 0.15,
    topP: 0.9,
    repPenalty: IS_IOS ? 1.3 : 1.22,
    maxTokens: IS_IOS ? 70 : 90,
  });

  if (!isDegenerateOutput(text)) return text;

  text = await runSection(engine, `${prompt}\n\nWichtig: Keine Wort- oder Satzwiederholungen. Formuliere einen zusammenhängenden fachlichen Text.`, {
    temperature: 0.3,
    topP: 0.85,
    repPenalty: IS_IOS ? 1.4 : 1.35,
    maxTokens: IS_IOS ? 60 : 80,
  });

  if (isDegenerateOutput(text)) {
    throw new Error('Die lokale KI ist in eine Wiederholungsschleife geraten. Der Entwurf wurde verworfen statt als fehlerhafter HEB-Text angezeigt.');
  }

  return text;
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  const engine = await loadEngine(onProgress);
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const outputs = [];

  for (let index = 0; index < sections.length; index += 1) {
    const [sectionMode, sectionLabel] = sections[index];
    setModelState({
      status: 'generating',
      percent: 100,
      text: `KI formuliert ${index + 1}/${sections.length} …`,
      error: null,
    }, onProgress);

    const prompt = buildSectionPrompt({ notes, area, formType, sectionMode, sectionLabel });
    const sectionText = await generateSection(engine, prompt);
    outputs.push(`${sectionLabel}\n${sectionText}`);
  }

  const finalText = outputs.join('\n\n').trim();
  if (!finalText) throw new Error('Die lokale KI hat kein verwertbares Ergebnis geliefert.');

  setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
  return finalText;
}

export function getModelInfo() {
  return modelInfo;
}
