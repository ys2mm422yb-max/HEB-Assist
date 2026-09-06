import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import {
  splitEvidenceUnits,
  evidenceCatalog,
  validateAnchoredHebText,
} from './evidence-pipeline.js';
import { selectEvidenceForSection } from './evidence-router.js';

const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const MODEL_KEY = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Llama 3.2 1B Instruct';
const MODEL_PROFILE = 'webllm-llama32-1b-source-routed-v8-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';
const UNSAFE_TEXT = 'Die vorhandenen Angaben konnten für diesen Unterpunkt nicht sicher formuliert werden.';

// Architektur v8
// ---------------
// v7 ließ das kleine Sprachmodell jeden Unterpunkt aus allen Quellen selbst
// erkennen und anschließend mit demselben Modell nochmals verifizieren. Im
// realen iPhone-Test führte das zu falschem KEINE_ANGABE und zu unnötigen
// Verwerfungen. v8 trennt deshalb die Aufgaben:
// - lokale Regeln wählen nur passende ORIGINALAUSSAGEN für einen Unterpunkt aus;
// - diese Regeln erzeugen niemals HEB-Prosa und sind kein Ersatzmodus;
// - die vollständig gestartete lokale KI formuliert ausschließlich aus diesem
//   kleineren Quellenpaket;
// - eine harte lokale Sicherheitsprüfung prüft die KI-Ausgabe;
// - nur bei einem fehlgeschlagenen ersten KI-Versuch gibt es genau einen
//   quellen-nahen KI-Reparaturversuch;
// - es gibt keine zweite KI als JA/NEIN-Verifizierer mehr.
// Dadurch bleiben die Aufgaben für das 1B-Modell kleiner und die Laufzeit auf
// iOS begrenzt, ohne erfundene regelbasierte HEB-Texte auszugeben.

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
  A: { current: 52, support: 34, goals: 28, measures: 38 },
  B: { reflection: 42, development: 50, support: 34, goals: 28, measures: 38 },
  C: { reflection: 42, development: 48, remainingSupport: 34, furtherMeasures: 36, provider: 18 },
};

const SECTION_GUIDANCE = {
  current: 'Fasse die aktuelle Situation, die Schwierigkeit und vorhandene Ressourcen knapp zusammen. Erhalte jede genannte Selbstständigkeit vollständig.',
  support: 'Formuliere ausschließlich den belegten Unterstützungsbedarf. Ist Hilfe nur beim Beginn nötig, schreibe ausdrücklich zur Initiierung bzw. zum Beginn und nicht bei der Durchführung.',
  goals: 'Formuliere nur ausdrücklich genannte Ziele, Wünsche oder zukünftige Soll-Zustände.',
  measures: 'Formuliere nur die in den Quellen tatsächlich beschriebenen Unterstützungs-Handlungen fachlich knapp. Keine neue Maßnahme und kein neues Ziel ergänzen.',
  reflection: 'Formuliere nur tatsächlich durchgeführte Maßnahmen und nur ausdrücklich genannte Wirkung oder Verlauf.',
  development: 'Formuliere nur eine ausdrücklich erkennbare Entwicklung, Stabilität oder Verschlechterung im zeitlichen Vergleich.',
  remainingSupport: 'Formuliere nur den ausdrücklich noch bestehenden Unterstützungsbedarf.',
  furtherMeasures: 'Formuliere nur ausdrücklich vorgesehene weitere Maßnahmen.',
  provider: 'Nenne nur einen ausdrücklich genannten Erbringer weiterer Maßnahmen.',
};

const WRITER_SYSTEM = `Du formulierst kurze professionelle HEB-Texte für die sozialpsychiatrische Eingliederungshilfe.
Du erhältst nur Originalaussagen, die für genau einen HEB-Unterpunkt ausgewählt wurden.
Verwende ausschließlich Tatsachen aus diesen Originalaussagen.
Erfinde niemals Diagnosen, Symptome, Ursachen, Motive, Bewertungen, Fähigkeiten, Risiken, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfsstufen oder Anbieter.
Verändere niemals den Umfang einer Unterstützung.
Unterstützung beim Beginn oder bei der Initiierung darf nicht zu Unterstützung bei der Durchführung werden.
Vorhandene Selbstständigkeit muss vollständig erhalten bleiben.
Keine moralischen Bewertungen, keine Listen, kein Markdown, keine Überschrift, keine Meta-Kommentare.
Schreibe korrektes, natürliches, neutrales, ressourcenorientiertes Deutsch.
Wenn die Originalaussagen für den verlangten Unterpunkt trotz der Vorauswahl nicht passen, antworte exakt mit KEINE_ANGABE.`;

const REPAIR_SYSTEM = `Du überarbeitest einen HEB-Text extrem quellen-nah.
Verwende ausschließlich die angegebenen Originalaussagen und verändere keine Tatsachen.
Übernimm Tätigkeiten, Unterstützungsumfang, Häufigkeit und Selbstständigkeit inhaltlich unverändert.
Keine neue Ursache, Bewertung, Diagnose, Fähigkeit, Maßnahme oder Ziel ergänzen.
Schreibe höchstens zwei kurze vollständige Sätze ohne Überschrift, Liste oder Meta-Kommentar.`;

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
        pipeline: 'Quellenrouting + begrenzte lokale Abschnittsformulierung',
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

function getMaxWords(formType, sectionMode) {
  return SECTION_LENGTHS[formType]?.[sectionMode] || 36;
}

function buildSectionPrompt({ notesCatalog, formType, area, sectionMode, sectionLabel }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const maxWords = getMaxWords(formType, sectionMode);
  const guide = SECTION_GUIDANCE[sectionMode] || 'Formuliere ausschließlich passende, belegte Angaben.';

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nAusgewählte Originalaussagen:\n${notesCatalog}\n\nAufgabe:\n${guide}\nFormuliere einen kompakten HEB-Abschnitt mit höchstens ${maxWords} Wörtern. Keine Überschrift und keine Liste.`;
}

function buildRepairPrompt({ notesCatalog, sectionLabel, firstCandidate, maxWords }) {
  return `HEB-Unterpunkt: ${sectionLabel}\n\nOriginalaussagen:\n${notesCatalog}\n\nErster Entwurf, der die Sicherheitsprüfung nicht bestanden hat:\n${firstCandidate || '(leer)'}\n\nFormuliere erneut und deutlich näher an den Originalaussagen. Ändere keine Bedeutung. Verwende höchstens ${maxWords} Wörter. Wenn die Quellen für den Unterpunkt nicht ausreichen, antworte exakt mit KEINE_ANGABE.`;
}

async function runWriter(engine, system, prompt, maxWords) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    repetition_penalty: 1.02,
    max_tokens: Math.min(128, Math.max(52, Math.round(maxWords * 2.15))),
    seed: 17,
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

function candidateIsMissing(candidate) {
  return !candidate || /^KEINE_ANGABE[.!]?$/i.test(candidate);
}

function candidatePasses(candidate, evidenceTexts, maxWords) {
  if (candidateIsMissing(candidate)) return false;
  const hardCheck = validateAnchoredHebText(candidate, evidenceTexts, { maxWords });
  return hardCheck.ok && wordCount(candidate) <= maxWords + 4;
}

async function generateSection(engine, context) {
  const { formType, sectionMode, sectionLabel, area, units } = context;
  const selectedUnits = selectEvidenceForSection(units, formType, sectionMode, { maxUnits: 6 });
  if (!selectedUnits.length) return MISSING_TEXT;

  const notesCatalog = evidenceCatalog(selectedUnits);
  const evidenceTexts = selectedUnits.map((unit) => unit.text);
  const maxWords = getMaxWords(formType, sectionMode);

  const prompt = buildSectionPrompt({ notesCatalog, formType, area, sectionMode, sectionLabel });
  const firstCandidate = await runWriter(engine, WRITER_SYSTEM, prompt, maxWords);
  if (candidatePasses(firstCandidate, evidenceTexts, maxWords)) return firstCandidate;

  const repairPrompt = buildRepairPrompt({
    notesCatalog,
    sectionLabel,
    firstCandidate,
    maxWords,
  });
  const repaired = await runWriter(engine, REPAIR_SYSTEM, repairPrompt, maxWords);
  if (candidatePasses(repaired, evidenceTexts, maxWords)) return repaired;

  if (candidateIsMissing(firstCandidate) && candidateIsMissing(repaired)) return MISSING_TEXT;
  return UNSAFE_TEXT;
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  void mode;
  const engine = await loadEngine(onProgress);
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const units = splitEvidenceUnits(notes);

  if (!units.length) {
    const error = new Error('Die Eingabe enthält keine verwertbaren Angaben.');
    error.code = 'QUALITY_REJECTED';
    throw error;
  }

  const outputs = [];

  try {
    for (let index = 0; index < sections.length; index += 1) {
      const [sectionMode, sectionLabel] = sections[index];

      setModelState({
        status: 'generating',
        percent: 100,
        text: `KI bearbeitet ${index + 1}/${sections.length}: ${sectionLabel.slice(0, 2)} …`,
        error: null,
      }, onProgress);

      let sectionText = UNSAFE_TEXT;
      try {
        sectionText = await generateSection(engine, {
          units,
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
