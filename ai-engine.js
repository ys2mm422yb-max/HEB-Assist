import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import {
  splitEvidenceUnits,
  evidenceCatalog,
  validateAnchoredHebText,
} from './evidence-pipeline.js';

const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const MODEL_KEY = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Llama 3.2 1B Instruct';
const MODEL_PROFILE = 'webllm-llama32-1b-bounded-sections-v7-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';
const UNSAFE_TEXT = 'Die vorhandenen Angaben konnten für diesen Unterpunkt nicht sicher formuliert werden.';

// Architektur v7
// ---------------
// Der vorherige unterpunktweise Mikro-Ansatz konnte auf iOS sehr viele serielle
// Modellaufrufe erzeugen und dadurch minutenlang scheinbar hängen. Jetzt gilt:
// - pro HEB-Unterpunkt genau EIN Generierungsaufruf,
// - danach genau EINE lokale semantische Gegenprüfung,
// - keine Kaskade aus Quellenwahl + mehreren Mikrosätzen + Wiederholungsversuchen,
// - fehlende Ziele/Entwicklungen werden transparent als fehlende Angabe behandelt,
// - unsichere Ausgaben werden nur für den betroffenen Unterpunkt verworfen.
// Es gibt weiterhin keinen regelbasierten Ersatz-HEB und keine externe Inferenz.

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

const SECTION_LENGTHS = {
  A: {
    current: 52,
    support: 34,
    goals: 28,
    measures: 38,
  },
  B: {
    reflection: 42,
    development: 50,
    support: 34,
    goals: 28,
    measures: 38,
  },
  C: {
    reflection: 42,
    development: 48,
    remainingSupport: 34,
    furtherMeasures: 36,
    provider: 18,
  },
};

const SECTION_GUIDANCE = {
  current: 'Beschreibe nur die aktuelle Situation, Schwierigkeiten und vorhandenen Ressourcen. Vorhandene Selbstständigkeit klar erhalten.',
  support: 'Beschreibe nur den tatsächlich erkennbaren Unterstützungsbedarf. Initiierung, Organisation und Durchführung nicht miteinander verwechseln. Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt ist.',
  goals: 'Formuliere nur ausdrücklich genannte Ziele, Wünsche oder zukünftige Soll-Zustände. Fehlt ein Ziel, antworte exakt mit KEINE_ANGABE.',
  measures: 'Beschreibe nur konkrete Unterstützungen oder Handlungen, die in der Eingabe tatsächlich erfolgen oder ausdrücklich vorgesehen sind.',
  reflection: 'Beschreibe nur tatsächlich durchgeführte Maßnahmen und nur ausdrücklich genannte Wirkung oder Verlauf.',
  development: 'Beschreibe nur eine ausdrücklich erkennbare Entwicklung, Stabilität oder Verschlechterung im zeitlichen Vergleich. Fehlt ein Verlauf, antworte exakt mit KEINE_ANGABE.',
  remainingSupport: 'Beschreibe nur den ausdrücklich noch bestehenden Unterstützungsbedarf.',
  furtherMeasures: 'Beschreibe nur ausdrücklich vorgesehene weitere Maßnahmen.',
  provider: 'Nenne nur einen ausdrücklich genannten Erbringer weiterer Maßnahmen. Fehlt diese Angabe, antworte exakt mit KEINE_ANGABE.',
};

const WRITER_SYSTEM = `Du erstellst einen kurzen professionellen HEB-Text für die sozialpsychiatrische Eingliederungshilfe.
Verwende ausschließlich Tatsachen aus den angegebenen Originalquellen.
Erfinde niemals Diagnosen, Symptome, Ursachen, Motive, Bewertungen, Fähigkeiten, Risiken, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfsstufen oder Anbieter.
Beobachtung, Selbstaussage und fachliche Einschätzung dürfen nicht vermischt werden.
Unterstützung beim Beginn darf nicht zu Unterstützung bei der Durchführung werden.
Vorhandene Selbstständigkeit darf nicht abgeschwächt werden.
Keine moralischen Bewertungen, keine Listen, kein Markdown, keine Überschrift, keine Meta-Kommentare.
Schreibe korrektes, natürliches, neutrales und ressourcenorientiertes Deutsch.
Wenn für den verlangten HEB-Unterpunkt keine passende Information in den Quellen vorhanden ist, antworte exakt mit KEINE_ANGABE.`;

const VERIFIER_SYSTEM = `Du prüfst einen HEB-Abschnitt gegen die Originalquellen und den verlangten HEB-Unterpunkt.
Antworte exakt JA nur dann, wenn jede Tatsachenaussage vollständig durch die Quellen gedeckt ist, der Unterstützungsumfang nicht verändert wurde, keine neue Ursache oder Bewertung hinzukommt und der Text fachlich zum angegebenen Unterpunkt passt.
Antworte sonst exakt NEIN.`;

let enginePromise = null;
let engineInstance = null;
let modelInfo = null;
let webllmModule = null;
let appConfig = null;
let modelState = { status: 'idle', percent: 0, text: 'KI wird vorbereitet …', error: null };

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

function germanLoadingText(report, fromCache, percent) {
  const rawText = String(report?.text || '').toLowerCase();
  const isStarting = percent >= 90 || /compile|compiling|shader|gpu|initializ|instantiate|loading model/.test(rawText);
  if (fromCache) {
    return isStarting
      ? 'Gespeichertes Sprachmodell wird auf dem Gerät gestartet …'
      : 'Gespeichertes Sprachmodell wird aus dem Gerätespeicher geladen …';
  }
  if (isStarting) return 'Sprachmodell wird auf dem Gerät gestartet …';
  if (/cache|caching|store|saving/.test(rawText)) return 'Sprachmodell wird lokal auf dem Gerät gespeichert …';
  return 'Sprachmodell wird heruntergeladen und lokal gespeichert …';
}

function mapInitProgress(report, onProgress, fromCache) {
  const raw = Number(report?.progress ?? 0);
  const percent = Math.min(96, Math.max(4, Math.round(raw * 100)));
  setModelState({
    status: 'loading',
    percent,
    text: germanLoadingText(report, fromCache, percent),
    error: null,
  }, onProgress);
}

async function prepareRuntime(onProgress) {
  if (webllmModule && appConfig) return { webllm: webllmModule, appConfig };

  setModelState({ status: 'loading', percent: 3, text: 'Lokale KI-Laufzeit wird vorbereitet …', error: null }, onProgress);
  const webllm = await import(WEBLLM_URL);
  const modelList = webllm.prebuiltAppConfig.model_list.map((entry) => {
    if (entry.model_id !== MODEL_KEY) return entry;
    return {
      ...entry,
      overrides: {
        ...(entry.overrides || {}),
        context_window_size: CONTEXT_WINDOW_SIZE,
      },
    };
  });

  const config = { ...webllm.prebuiltAppConfig, cacheBackend: 'cache', model_list: modelList };
  if (!config.model_list.some((entry) => entry.model_id === MODEL_KEY)) {
    throw new Error(`Das lokale Modell ${MODEL_KEY} wird von WebLLM 0.2.82 nicht unterstützt.`);
  }

  try { await navigator.storage?.persist?.(); } catch { /* optionale Browser-Optimierung */ }
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
      try { cached = await webllm.hasModelInCache(MODEL_KEY, config); } catch { cached = false; }

      setModelState({
        status: 'loading',
        percent: 4,
        text: cached
          ? 'Gespeichertes Sprachmodell wird auf dem Gerät gestartet …'
          : 'Sprachmodell wird beim ersten Start heruntergeladen und lokal zwischengespeichert …',
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
        runtimeLabel: 'WebLLM 0.2.82',
        persistentCache: 'Cache API',
        contextLength: CONTEXT_WINDOW_SIZE,
        pipeline: 'Begrenzte unterpunktweise Generierung mit lokaler Gegenprüfung',
      };
      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
      return engine;
    })().catch((error) => {
      enginePromise = null;
      engineInstance = null;
      const message = error?.message || String(error);
      setModelState({ status: 'error', percent: 0, text: 'KI nicht verfügbar', error: message }, onProgress);
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

function normalizeOutput(text) {
  return String(text || '')
    .replace(/<\|im_start\|>|<\|im_end\|>|<bos>|<eos>/gi, '')
    .replace(/^assistant\s*:?\s*/i, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  return (String(text || '').trim().match(/\S+/g) || []).length;
}

function hasGoalEvidence(notes) {
  return /\b(ziel\w*|soll\w*|möchte\w*|wunsch\w*|angestrebt\w*|erhalten\w*|stabilisier\w*|weiterentwick\w*|verbesser\w*|förder\w*|künftig\w*|zukünftig\w*)\b/i.test(notes);
}

function hasDevelopmentEvidence(notes) {
  return /\b(im letzten|seit|früher|inzwischen|nun|zunehm\w*|abnehm\w*|mehr|weniger|verbesser\w*|verschlechter\w*|stabil\w*|entwick\w*|fortschritt\w*|rückschritt\w*|verlauf\w*)\b/i.test(notes);
}

function shouldSkipSection(formType, sectionMode, notes) {
  if ((formType === 'A' || formType === 'B') && sectionMode === 'goals' && !hasGoalEvidence(notes)) return true;
  if ((formType === 'B' || formType === 'C') && sectionMode === 'development' && !hasDevelopmentEvidence(notes)) return true;
  return false;
}

function getMaxWords(formType, sectionMode) {
  return SECTION_LENGTHS[formType]?.[sectionMode] || 36;
}

function buildSectionPrompt({ notesCatalog, formType, area, sectionMode, sectionLabel }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const maxWords = getMaxWords(formType, sectionMode);
  const guide = SECTION_GUIDANCE[sectionMode] || 'Formuliere ausschließlich passende, belegte Angaben.';

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nOriginalquellen:\n${notesCatalog}\n\nAufgabe:\n${guide}\nFormuliere einen kompakten HEB-Abschnitt mit höchstens ${maxWords} Wörtern. Verwende nur die Originalquellen. Keine Überschrift. Keine Liste. Wenn keine passende Information vorhanden ist, antworte exakt mit KEINE_ANGABE.`;
}

async function runSectionWriter(engine, prompt, maxWords) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: WRITER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    repetition_penalty: 1.02,
    max_tokens: Math.min(128, Math.max(56, Math.round(maxWords * 2.2))),
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

function buildVerifierPrompt({ notesCatalog, sectionLabel, candidate }) {
  return `HEB-Unterpunkt: ${sectionLabel}\n\nOriginalquellen:\n${notesCatalog}\n\nZu prüfender HEB-Text:\n${candidate}\n\nIst jede Tatsachenaussage vollständig belegt, ohne neue Ursache/Bewertung/Bedeutungsverschiebung, und passt der Text fachlich genau zu diesem Unterpunkt?`;
}

async function verifySection(engine, context) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: VERIFIER_SYSTEM },
      { role: 'user', content: buildVerifierPrompt(context) },
    ],
    temperature: 0,
    top_p: 1,
    repetition_penalty: 1,
    max_tokens: 5,
  });
  return /^JA\b/i.test(normalizeOutput(response?.choices?.[0]?.message?.content || ''));
}

async function generateSection(engine, context) {
  const { formType, sectionMode, sectionLabel, notesCatalog, evidenceTexts } = context;
  const maxWords = getMaxWords(formType, sectionMode);
  const candidate = await runSectionWriter(engine, buildSectionPrompt(context), maxWords);

  if (!candidate || /^KEINE_ANGABE[.!]?$/i.test(candidate)) return MISSING_TEXT;

  const hardCheck = validateAnchoredHebText(candidate, evidenceTexts, { maxWords });
  if (!hardCheck.ok || wordCount(candidate) > maxWords + 4) return UNSAFE_TEXT;

  const verified = await verifySection(engine, {
    notesCatalog,
    sectionLabel,
    candidate,
  });
  return verified ? candidate : UNSAFE_TEXT;
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  const engine = await loadEngine(onProgress);
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const units = splitEvidenceUnits(notes);

  if (!units.length) {
    const error = new Error('Die Eingabe enthält keine verwertbaren Angaben.');
    error.code = 'QUALITY_REJECTED';
    throw error;
  }

  const notesCatalog = evidenceCatalog(units);
  const evidenceTexts = units.map((unit) => unit.text);
  const outputs = [];

  try {
    for (let index = 0; index < sections.length; index += 1) {
      const [sectionMode, sectionLabel] = sections[index];

      if (shouldSkipSection(formType, sectionMode, notes)) {
        outputs.push(`${sectionLabel}\n${MISSING_TEXT}`);
        continue;
      }

      setModelState({
        status: 'generating',
        percent: 100,
        text: `KI bearbeitet ${index + 1}/${sections.length}: ${sectionLabel.slice(0, 2)} …`,
        error: null,
      }, onProgress);

      let sectionText = UNSAFE_TEXT;
      try {
        sectionText = await generateSection(engine, {
          notes,
          notesCatalog,
          evidenceTexts,
          formType,
          area,
          sectionMode,
          sectionLabel,
        });
      } catch (error) {
        console.warn(`HEB section ${sectionMode} failed:`, error?.message || error);
        sectionText = UNSAFE_TEXT;
      }

      outputs.push(`${sectionLabel}\n${sectionText}`);
    }

    const finalText = outputs.join('\n\n').trim();
    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    return finalText;
  } catch (error) {
    if (engineInstance) {
      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    }
    throw error;
  }
}

export function getModelInfo() {
  return modelInfo;
}
