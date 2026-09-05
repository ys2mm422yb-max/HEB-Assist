import { HEB_FORM_CONFIG, getOutputInstruction } from './heb-knowledge.js';

const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm';
const MODEL_KEY = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Qwen 2.5 0.5B Instruct';
const MODEL_PROFILE = 'webllm-qwen25-05b-cached';

const CORE_RULES = `Du bist HEB Assist. Du formulierst ausschließlich professionelle HEB-Texte für die sozialpsychiatrische Eingliederungshilfe.

Verbindliche Regeln:
- Nutze ausschließlich Tatsachen aus der Fallbeschreibung. Nichts erfinden, vermuten oder ergänzen.
- Keine Diagnose, Ursache, Symptome, Risiken, Fähigkeiten, Ressourcen, Entwicklung, Ziele, Maßnahmen oder Hilfebedarfe ergänzen, die nicht aus der Eingabe hervorgehen.
- Schreibe in klarem, korrektem, professionellem Deutsch.
- Sachlich, wertschätzend, ressourcenorientiert und personenzentriert formulieren.
- Verwende „die Person“ oder „die leistungsberechtigte Person“, keine Namen.
- Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt wurde.
- Keine Überschriften, Listen, HEB-Kürzel oder Meta-Kommentare in der eigentlichen Antwort.
- Wenn für den verlangten Unterpunkt Angaben fehlen, antworte exakt: „Hierzu liegen keine ausreichenden Angaben vor.“
- Antworte nur mit dem fertigen Text für genau den angeforderten Unterpunkt.`;

const SECTION_MODES = {
  A: [
    ['current', 'a) Aktuelle Situation bzw. Problemlage unter Berücksichtigung der Ressourcen'],
    ['support', 'b) Einschätzung des Hilfebedarfs'],
    ['goals', 'c) Rahmenziele für den Planungszeitraum'],
    ['measures', 'd) Beschreibung der geplanten Maßnahmen'],
  ],
  B: [
    ['reflection', 'a) Reflexion der durchgeführten Maßnahmen'],
    ['development', 'b) Beschreibung der Entwicklung innerhalb des letzten Planungszeitraumes anhand der Rahmenziele unter Berücksichtigung der Ressourcen'],
    ['support', 'c) Einschätzung des Hilfebedarfs'],
    ['goals', 'd) Fortschreibung der Rahmenziele'],
    ['measures', 'e) Beschreibung der geplanten Maßnahmen'],
  ],
  C: [
    ['reflection', 'a) Reflexion der durchgeführten Maßnahmen im letzten Förderzeitraum'],
    ['development', 'b) Beschreibung der Entwicklung anhand der Rahmenziele unter Berücksichtigung der Ressourcen'],
    ['remainingSupport', 'c) Einschätzung des noch bestehenden Hilfebedarfs'],
    ['furtherMeasures', 'd) Welche weiteren Maßnahmen sind vorgesehen'],
    ['provider', 'e) Durch wen werden diese Maßnahmen erbracht'],
  ],
};

let enginePromise = null;
let engineInstance = null;
let modelInfo = null;
let webllmModule = null;
let appConfig = null;
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
    runtime: 'webllm',
    label: hasWebGPU ? 'Lokale KI verfügbar' : 'Lokale KI nicht verfügbar',
  };
}

export function getLocalAiStatus() {
  return { ...modelState };
}

export function isLocalAiReady() {
  return Boolean(engineInstance);
}

function mapInitProgress(report, onProgress, fromCache) {
  const raw = Number(report?.progress ?? 0);
  const percent = Math.min(96, Math.max(4, Math.round(raw * 100)));
  const text = report?.text || (fromCache
    ? 'Lokales Sprachmodell wird aus dem Gerätespeicher geladen …'
    : 'Sprachmodell wird einmalig heruntergeladen und lokal gespeichert …');

  setModelState({
    status: 'loading',
    percent,
    text,
    error: null,
  }, onProgress);
}

async function prepareRuntime(onProgress) {
  if (webllmModule && appConfig) return { webllm: webllmModule, appConfig };

  setModelState({
    status: 'loading',
    percent: 3,
    text: 'Lokale KI-Laufzeit wird vorbereitet …',
    error: null,
  }, onProgress);

  const webllm = await import(WEBLLM_URL);
  const config = {
    ...webllm.prebuiltAppConfig,
    cacheBackend: 'cache',
    model_list: [...webllm.prebuiltAppConfig.model_list],
  };

  const supportedModel = config.model_list.some((entry) => entry.model_id === MODEL_KEY);
  if (!supportedModel) {
    throw new Error(`Das lokale Modell ${MODEL_KEY} wird von der geladenen WebLLM-Version nicht unterstützt.`);
  }

  try {
    await navigator.storage?.persist?.();
  } catch {
    // Persistenz ist eine Optimierung; Safari kann die Anfrage ablehnen.
  }

  webllmModule = webllm;
  appConfig = config;
  return { webllm, appConfig: config };
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
      const { webllm, appConfig: config } = await prepareRuntime(onProgress);
      let cached = false;

      try {
        cached = await webllm.hasModelInCache(MODEL_KEY, config);
      } catch {
        cached = false;
      }

      setModelState({
        status: 'loading',
        percent: 4,
        text: cached
          ? 'Gespeichertes Sprachmodell wird auf dem Gerät gestartet …'
          : 'Sprachmodell wird beim ersten Start heruntergeladen und dauerhaft lokal zwischengespeichert …',
        error: null,
      }, onProgress);

      const engine = await webllm.CreateMLCEngine(MODEL_KEY, {
        appConfig: config,
        initProgressCallback: (report) => mapInitProgress(report, onProgress, cached),
        logLevel: 'WARN',
      });

      engineInstance = engine;
      modelInfo = {
        id: MODEL_KEY,
        label: MODEL_LABEL,
        profile: MODEL_PROFILE,
        device: 'webgpu',
        runtimeLabel: 'WebLLM',
        persistentCache: 'Cache API',
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

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nAufgabe:\n${instruction}\n\nFallbeschreibung:\n${notes}\n\nFormuliere ausschließlich den Inhalt dieses Unterpunkts. 1 bis 3 vollständige Sätze, höchstens 80 Wörter. Verwende nur Informationen aus der Fallbeschreibung. Fehlen die notwendigen Angaben, antworte exakt mit: Hierzu liegen keine ausreichenden Angaben vor.`;
}

function normalizeOutput(text) {
  return String(text || '')
    .replace(/<\|im_start\|>|<\|im_end\|>|<bos>|<eos>/gi, '')
    .replace(/^assistant\s*:?\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isDegenerateOutput(text) {
  const cleaned = normalizeOutput(text);
  if (!cleaned) return true;

  if (/\bHEBI?[-:]|HEB-(?:Bereich|Reise|Bereit|Beispiel)|Abstand\s*100\s*%/i.test(cleaned)) return true;
  if (/\b(?:[A-Za-zÄÖÜäöüß]+-){3,}[A-Za-zÄÖÜäöüß]+\b/.test(cleaned)) return true;

  const lines = cleaned
    .split(/\n+/)
    .map((line) => line.trim().toLowerCase())
    .filter(Boolean);
  const lineCounts = new Map();
  for (const line of lines) lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
  if ([...lineCounts.values()].some((count) => count >= 2)) return true;

  const words = cleaned.toLowerCase().match(/[a-zäöüß0-9-]+/g) || [];
  if (words.length >= 12) {
    const counts = new Map();
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
    const mostCommon = Math.max(...counts.values());
    const uniqueRatio = counts.size / words.length;
    if (mostCommon >= 6 || uniqueRatio < 0.38) return true;
  }

  return false;
}

async function runSection(engine, prompt, strictRetry = false) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: CORE_RULES },
      {
        role: 'user',
        content: strictRetry
          ? `${prompt}\n\nPrüfe vor der Ausgabe: korrektes Deutsch, keine erfundenen Inhalte, keine Listen, keine HEB-Kürzel, keine Wortketten und keine Wiederholungen.`
          : prompt,
      },
    ],
    temperature: strictRetry ? 0.05 : 0.1,
    top_p: 0.85,
    repetition_penalty: strictRetry ? 1.2 : 1.12,
    max_tokens: strictRetry ? 100 : 110,
  });

  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

async function generateSection(engine, prompt) {
  let text = await runSection(engine, prompt, false);
  if (!isDegenerateOutput(text)) return text;

  text = await runSection(engine, prompt, true);
  if (isDegenerateOutput(text)) {
    throw new Error('Die lokale KI hat keinen sprachlich verwertbaren HEB-Text erzeugt. Der fehlerhafte Entwurf wurde verworfen.');
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
