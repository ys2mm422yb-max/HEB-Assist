import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import {
  splitEvidenceUnits,
  evidenceCatalog,
  parseEvidenceClassification,
  getEvidenceTexts,
  validateAnchoredHebText,
} from './evidence-pipeline.js';

const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const MODEL_KEY = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Llama 3.2 1B Instruct';
const MODEL_PROFILE = 'webllm-llama32-1b-evidence-gated-micro-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';

// Architektur v3:
// 1) Das echte lokale Sprachmodell ordnet ausschließlich vorhandene Quellen-IDs zu.
// 2) Jeder Formulierungsschritt erhält danach genau EINEN verifizierten Originalbeleg.
// 3) Jeder daraus erzeugte Mikrosatz wird lokal gegen genau diesen Beleg geprüft.
// 4) Erst bestandene Mikrosätze werden zu einem kurzen HEB-Unterpunkt zusammengesetzt.
// 5) Scheitert die KI oder die Quellenprüfung, gibt es keinen Ersatztext.

const CLASSIFIER_SYSTEM = `Du ordnest ausschließlich Quellen-IDs aus einer Fallbeschreibung den offiziellen HEB-Unterpunkten zu.
Erfinde niemals Inhalte. Schreibe keine HEB-Texte und keine Begründungen.
Verwende nur IDs, die in der Eingabe tatsächlich vorhanden sind.
Eine Quellen-ID darf mehreren Unterpunkten zugeordnet werden, wenn derselbe Beleg dort wirklich relevant ist.
Ziele nur zuordnen, wenn im Original tatsächlich ein Ziel, Wunsch, Soll-Zustand oder eine Zukunftsabsicht genannt ist.
Maßnahmen nur zuordnen, wenn im Original eine konkrete Unterstützung beschrieben oder ausdrücklich vorgesehen ist.`;

const WRITER_SYSTEM = `Du formulierst genau einen kurzen professionellen HEB-Satz für die sozialpsychiatrische Eingliederungshilfe.
Du bekommst genau einen freigegebenen Originalbeleg. Verwende ausschließlich dessen Inhalt.
Du darfst Grammatik und Satzstellung verbessern, aber keine neue Tatsache ergänzen und nichts aus anderen Aussagen vermischen.
Verboten sind neue Diagnosen, Symptome, Ursachen, Motive, Bewertungen, Fähigkeiten, Risiken, Entwicklungen, Ziele, Maßnahmen oder Anbieter.
Wenn der Originalbeleg nur einen Impuls zum Beginn beschreibt, darfst du daraus keine Unterstützung bei der Durchführung machen.
Wenn der Originalbeleg Selbstständigkeit beschreibt, darfst du diese nicht abschwächen.
Keine moralischen Bewertungen, keine Überschrift, keine Liste, kein Markdown, kein Ausrufezeichen, keine Meta-Kommentare.
Schreibe korrektes, natürliches, sachliches und ressourcenorientiertes Deutsch.
Gib nur den fertigen Satz aus.`;

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
    current: { maxWords: 46, sentences: '2 bis 3', maxEvidence: 3, microWords: 22 },
    support: { maxWords: 34, sentences: '1 bis 2', maxEvidence: 2, microWords: 20 },
    goals: { maxWords: 28, sentences: '1', maxEvidence: 1, microWords: 24 },
    measures: { maxWords: 36, sentences: '1 bis 2', maxEvidence: 2, microWords: 20 },
  },
  B: {
    reflection: { maxWords: 44, sentences: '2', maxEvidence: 2, microWords: 22 },
    development: { maxWords: 50, sentences: '2 bis 3', maxEvidence: 3, microWords: 22 },
    support: { maxWords: 32, sentences: '1 bis 2', maxEvidence: 2, microWords: 19 },
    goals: { maxWords: 28, sentences: '1', maxEvidence: 1, microWords: 24 },
    measures: { maxWords: 36, sentences: '1 bis 2', maxEvidence: 2, microWords: 20 },
  },
  C: {
    reflection: { maxWords: 44, sentences: '2', maxEvidence: 2, microWords: 22 },
    development: { maxWords: 48, sentences: '2 bis 3', maxEvidence: 3, microWords: 21 },
    remainingSupport: { maxWords: 32, sentences: '1 bis 2', maxEvidence: 2, microWords: 19 },
    furtherMeasures: { maxWords: 34, sentences: '1 bis 2', maxEvidence: 2, microWords: 20 },
    provider: { maxWords: 18, sentences: '1', maxEvidence: 1, microWords: 18 },
  },
};

const WRITING_GUIDANCE = {
  current: 'Formuliere die Aussage als Teil der aktuellen Situation. Ressource oder Schwierigkeit exakt erhalten. Keine Ursache ergänzen.',
  support: 'Formuliere nur den in diesem Beleg enthaltenen Unterstützungsbedarf. Initiierung, Organisation und Durchführung nicht miteinander verwechseln.',
  goals: 'Formuliere nur die in diesem Beleg tatsächlich genannte Zielrichtung oder Zukunftsabsicht.',
  measures: 'Formuliere nur die in diesem Beleg tatsächlich beschriebene oder vorgesehene Unterstützungsform.',
  reflection: 'Formuliere nur die in diesem Beleg beschriebene durchgeführte Maßnahme und deren ausdrücklich genannten Verlauf oder Wirkung.',
  development: 'Formuliere nur die in diesem Beleg tatsächlich erkennbare Entwicklung, Stabilität oder Verschlechterung.',
  remainingSupport: 'Formuliere nur den in diesem Beleg ausdrücklich noch bestehenden Unterstützungsbedarf.',
  furtherMeasures: 'Formuliere nur die in diesem Beleg ausdrücklich vorgesehene weitere Maßnahme.',
  provider: 'Formuliere nur den in diesem Beleg ausdrücklich genannten Erbringer.',
};

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

  try {
    await navigator.storage?.persist?.();
  } catch {
    // Browser-Persistenz ist nur eine Optimierung und darf den Start nicht blockieren.
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
        pipeline: 'Quellenbasierte Mikro-Generierung',
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

function getLengthProfile(formType, sectionMode) {
  return SECTION_LENGTHS[formType]?.[sectionMode] || { maxWords: 36, sentences: '1 bis 2', maxEvidence: 2, microWords: 20 };
}

function evidenceLimitsFor(formType) {
  const result = {};
  for (const [mode] of SECTION_MODES[formType] || SECTION_MODES.A) {
    result[mode] = getLengthProfile(formType, mode).maxEvidence;
  }
  return result;
}

function classifierFormat(formType) {
  return (SECTION_MODES[formType] || SECTION_MODES.A)
    .map(([mode]) => `${mode}=`)
    .join('\n');
}

function buildClassifierPrompt({ units, formType, strict = false }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const sectionText = sections.map(([mode, label]) => `${mode}: ${label}`).join('\n');
  const limits = sections.map(([mode]) => `${mode} höchstens ${getLengthProfile(formType, mode).maxEvidence} IDs`).join('; ');

  return `HEB-Bogen: ${form.label}\n\nUnterpunkte:\n${sectionText}\n\nOriginalquellen:\n${evidenceCatalog(units)}\n\nOrdne nur passende Quellen-IDs zu. Priorisiere verschiedene wichtige Aspekte und die fachlich stärksten Belege. ${limits}.\n${strict ? 'Antworte ohne jeden Zusatz exakt im Format.' : 'Schreibe keine HEB-Texte, nur IDs.'}\n\nFormat:\n${classifierFormat(formType)}`;
}

function classificationNeedsRetry(map, { formType }) {
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const allIds = sections.flatMap(([mode]) => map[mode] || []);
  if (!allIds.length) return true;
  if (formType === 'A' && !(map.current || []).length) return true;
  return false;
}

function applyEvidencePolicy(map, { formType, notes }) {
  const result = {};
  for (const [mode] of SECTION_MODES[formType] || SECTION_MODES.A) {
    result[mode] = [...(map[mode] || [])];
  }

  if ((formType === 'A' || formType === 'B') && !hasGoalEvidence(notes)) result.goals = [];
  if ((formType === 'B' || formType === 'C') && !hasDevelopmentEvidence(notes)) result.development = [];
  return result;
}

async function runClassifier(engine, prompt, strict = false) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: CLASSIFIER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 0.9,
    repetition_penalty: 1.04,
    max_tokens: strict ? 88 : 104,
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

async function classifyEvidence(engine, { notes, units, formType, onProgress }) {
  const modes = (SECTION_MODES[formType] || SECTION_MODES.A).map(([mode]) => mode);
  const limits = evidenceLimitsFor(formType);

  setModelState({ status: 'generating', percent: 100, text: 'KI prüft und ordnet die Angaben …', error: null }, onProgress);

  let raw = await runClassifier(engine, buildClassifierPrompt({ units, formType, strict: false }), false);
  let map = applyEvidencePolicy(parseEvidenceClassification(raw, modes, units, limits), { formType, notes });
  if (!classificationNeedsRetry(map, { formType })) return map;

  raw = await runClassifier(engine, buildClassifierPrompt({ units, formType, strict: true }), true);
  map = applyEvidencePolicy(parseEvidenceClassification(raw, modes, units, limits), { formType, notes });
  if (!classificationNeedsRetry(map, { formType })) return map;

  const error = new Error('Die lokale KI konnte die Originalangaben nicht zuverlässig den HEB-Unterpunkten zuordnen.');
  error.code = 'QUALITY_REJECTED';
  throw error;
}

function buildMicroPrompt({ formType, area, sectionMode, sectionLabel, evidenceText, strict = false }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const length = getLengthProfile(formType, sectionMode);
  const guidance = WRITING_GUIDANCE[sectionMode] || '';

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nEinziger erlaubter Originalbeleg:\n${evidenceText}\n\n${guidance}\nFormuliere genau EINEN vollständigen Satz mit höchstens ${length.microWords} Wörtern. Inhalt und Umfang der Aussage müssen identisch bleiben.${strict ? '\nBleibe nahezu am Originalwortlaut. Ändere nur Grammatik und Satzstellung, soweit nötig.' : ''}`;
}

function makeQualityError(sectionLabel, reasons = []) {
  const details = reasons.length ? ` (${reasons.slice(0, 3).join('; ')})` : '';
  const error = new Error(`Die KI-Ausgabe für ${sectionLabel} hat die Quellenprüfung nicht bestanden und wurde verworfen.${details}`);
  error.code = 'QUALITY_REJECTED';
  error.sectionLabel = sectionLabel;
  return error;
}

function makeRuntimeError(error, sectionLabel) {
  const message = error?.message || String(error) || 'Unbekannter Laufzeitfehler';
  const wrapped = new Error(`Technischer Fehler bei der lokalen KI in ${sectionLabel}: ${message}`);
  wrapped.code = 'GENERATION_RUNTIME_ERROR';
  wrapped.sectionLabel = sectionLabel;
  return wrapped;
}

async function runMicroWriter(engine, prompt, strict = false) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: WRITER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 0.9,
    repetition_penalty: strict ? 1.10 : 1.05,
    max_tokens: strict ? 64 : 72,
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

async function generateMicroSentence(engine, context, evidenceText) {
  let lastReasons = [];
  let runtimeFailure = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const strict = attempt === 1;
    try {
      const text = await runMicroWriter(engine, buildMicroPrompt({ ...context, evidenceText, strict }), strict);
      const validation = validateAnchoredHebText(text, [evidenceText], {
        maxWords: getLengthProfile(context.formType, context.sectionMode).microWords,
      });
      if (validation.ok) return text;
      lastReasons = validation.reasons;
    } catch (error) {
      runtimeFailure = error;
    }
  }

  if (runtimeFailure && !lastReasons.length) throw makeRuntimeError(runtimeFailure, context.sectionLabel);
  throw makeQualityError(context.sectionLabel, lastReasons);
}

function combineMicroSentences(sentences, maxWords) {
  const chosen = [];
  const seen = new Set();

  for (const raw of sentences) {
    const sentence = normalizeOutput(raw);
    if (!sentence) continue;
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;

    const candidate = [...chosen, sentence].join(' ');
    if (wordCount(candidate) > maxWords + 3) break;
    seen.add(key);
    chosen.push(sentence);
  }

  return chosen.join(' ').trim();
}

async function generateSection(engine, context) {
  if (!context.evidenceTexts.length) return MISSING_TEXT;

  const length = getLengthProfile(context.formType, context.sectionMode);
  const microSentences = [];

  for (const evidenceText of context.evidenceTexts.slice(0, length.maxEvidence)) {
    const sentence = await generateMicroSentence(engine, context, evidenceText);
    microSentences.push(sentence);
  }

  const combined = combineMicroSentences(microSentences, length.maxWords);
  if (!combined) throw makeQualityError(context.sectionLabel, ['keine sichere Formulierung übrig']);
  return combined;
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  const engine = await loadEngine(onProgress);
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const units = splitEvidenceUnits(notes);
  if (!units.length) throw makeQualityError('Quellenanalyse', ['keine verwertbaren Angaben']);

  try {
    const evidenceMap = await classifyEvidence(engine, { notes, units, formType, onProgress });
    const outputs = [];

    for (let index = 0; index < sections.length; index += 1) {
      const [sectionMode, sectionLabel] = sections[index];
      const evidenceTexts = getEvidenceTexts(units, evidenceMap[sectionMode] || []);

      setModelState({
        status: 'generating',
        percent: 100,
        text: evidenceTexts.length
          ? `KI formuliert ${index + 1}/${sections.length} aus einzeln geprüften Belegen …`
          : `KI prüft ${index + 1}/${sections.length} …`,
        error: null,
      }, onProgress);

      const sectionText = await generateSection(engine, {
        formType,
        area,
        sectionMode,
        sectionLabel,
        evidenceTexts,
      });
      outputs.push(`${sectionLabel}\n${sectionText}`);
    }

    const finalText = outputs.join('\n\n').trim();
    if (!finalText) throw makeQualityError('Gesamter HEB-Entwurf');

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
