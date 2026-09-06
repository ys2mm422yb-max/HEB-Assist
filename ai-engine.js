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
const MODEL_PROFILE = 'webllm-llama32-1b-evidence-gated-v5-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';
const UNSAFE_TEXT = 'Die vorhandenen Angaben konnten für diesen Unterpunkt nicht sicher formuliert werden.';

// Architektur v5:
// - Die echte lokale KI muss vollständig gestartet sein.
// - Die KI ordnet ausschließlich vorhandene Quellen-IDs den HEB-Unterpunkten zu.
// - Jeder Formulierungsschritt erhält genau einen Originalbeleg.
// - Harte lokale Prüfregeln blockieren erfundene Ursachen, Zahlen, Bedeutungsverschiebungen,
//   degenerierte Sprache und andere bekannte Fehlermuster.
// - Nur bei rein lexikalischen Zweifeln darf eine zweite lokale KI-Prüfung entscheiden.
// - Scheitert eine sichere Umformulierung, darf ausschließlich der unveränderte Originalbeleg
//   übernommen werden, sofern er selbst ein vollständiger, unauffälliger Satz ist.
// - Gelingt auch das nicht, wird der betreffende Unterpunkt transparent als nicht sicher
//   formulierbar markiert. Es wird niemals ein erfundener Ersatztext erzeugt.

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

const VERIFIER_SYSTEM = `Du prüfst nur Faktentreue zwischen genau einem Originalbeleg und genau einem HEB-Satz.
Antworte JA, wenn der HEB-Satz denselben Sachverhalt nur sprachlich professioneller ausdrückt.
Antworte NEIN, sobald eine neue Tatsache, Ursache, Diagnose, Einschränkung, Fähigkeit, Maßnahme, Ziel, Entwicklung oder Bewertung hinzukommt oder der Umfang der Unterstützung verändert wird.
Antworte exakt nur mit JA oder NEIN.`;

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
    current: { maxWords: 46, maxEvidence: 3, microWords: 22 },
    support: { maxWords: 34, maxEvidence: 2, microWords: 20 },
    goals: { maxWords: 28, maxEvidence: 1, microWords: 24 },
    measures: { maxWords: 36, maxEvidence: 2, microWords: 20 },
  },
  B: {
    reflection: { maxWords: 44, maxEvidence: 2, microWords: 22 },
    development: { maxWords: 50, maxEvidence: 3, microWords: 22 },
    support: { maxWords: 32, maxEvidence: 2, microWords: 19 },
    goals: { maxWords: 28, maxEvidence: 1, microWords: 24 },
    measures: { maxWords: 36, maxEvidence: 2, microWords: 20 },
  },
  C: {
    reflection: { maxWords: 44, maxEvidence: 2, microWords: 22 },
    development: { maxWords: 48, maxEvidence: 3, microWords: 21 },
    remainingSupport: { maxWords: 32, maxEvidence: 2, microWords: 19 },
    furtherMeasures: { maxWords: 34, maxEvidence: 2, microWords: 20 },
    provider: { maxWords: 18, maxEvidence: 1, microWords: 18 },
  },
};

const WRITING_GUIDANCE = {
  current: 'Formuliere die aktuelle Situation quellengetreu. Ressourcen und Schwierigkeiten exakt erhalten. Keine Ursache ergänzen.',
  support: 'Formuliere nur den tatsächlich beschriebenen Unterstützungsbedarf. Initiierung, Organisation und Durchführung nicht miteinander verwechseln.',
  goals: 'Formuliere nur die tatsächlich genannte Zielrichtung oder Zukunftsabsicht.',
  measures: 'Formuliere nur die tatsächlich beschriebene oder vorgesehene Unterstützungsform.',
  reflection: 'Formuliere nur die tatsächlich beschriebene Maßnahme und nur ausdrücklich genannte Wirkung oder Verlauf.',
  development: 'Formuliere nur eine ausdrücklich erkennbare Entwicklung, Stabilität oder Verschlechterung.',
  remainingSupport: 'Formuliere nur den ausdrücklich noch bestehenden Unterstützungsbedarf.',
  furtherMeasures: 'Formuliere nur eine ausdrücklich vorgesehene weitere Maßnahme.',
  provider: 'Formuliere nur den ausdrücklich genannten Erbringer.',
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

  try { await navigator.storage?.persist?.(); } catch { /* optional */ }
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
        pipeline: 'Quellengebundene Generierung mit sicherer Originalbeleg-Übernahme',
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

function normalizeClassifierOutput(text) {
  return String(text || '')
    .replace(/<\|im_start\|>|<\|im_end\|>|<bos>|<eos>/gi, '')
    .replace(/^assistant\s*:?\s*/i, '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
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
  return SECTION_LENGTHS[formType]?.[sectionMode] || { maxWords: 36, maxEvidence: 2, microWords: 20 };
}

function evidenceLimitsFor(formType) {
  const result = {};
  for (const [mode] of SECTION_MODES[formType] || SECTION_MODES.A) {
    result[mode] = getLengthProfile(formType, mode).maxEvidence;
  }
  return result;
}

function classifierFormat(formType) {
  return (SECTION_MODES[formType] || SECTION_MODES.A).map(([mode]) => `${mode}=`).join('\n');
}

function buildClassifierPrompt({ units, formType, strict = false }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const sectionText = sections.map(([mode, label]) => `${mode}: ${label}`).join('\n');
  const limits = sections.map(([mode]) => `${mode} höchstens ${getLengthProfile(formType, mode).maxEvidence} IDs`).join('; ');
  return `HEB-Bogen: ${form.label}\n\nUnterpunkte:\n${sectionText}\n\nOriginalquellen:\n${evidenceCatalog(units)}\n\nOrdne nur passende Quellen-IDs zu. Priorisiere verschiedene wichtige Aspekte. ${limits}.\n${strict ? 'Antworte ohne jeden Zusatz exakt im Format.' : 'Schreibe keine HEB-Texte, nur IDs.'}\n\nFormat:\n${classifierFormat(formType)}`;
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
  for (const [mode] of SECTION_MODES[formType] || SECTION_MODES.A) result[mode] = [...(map[mode] || [])];
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
  return normalizeClassifierOutput(response?.choices?.[0]?.message?.content || '');
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

function buildMicroPrompt({ formType, area, sectionMode, sectionLabel, evidenceText, strictLevel = 0 }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const length = getLengthProfile(formType, sectionMode);
  const guidance = WRITING_GUIDANCE[sectionMode] || '';
  const strictText = strictLevel === 1
    ? '\nBleibe sehr nah am Originalwortlaut. Tausche keine inhaltstragenden Begriffe aus.'
    : strictLevel >= 2
      ? '\nFormuliere nur minimal um. Ändere möglichst nur Satzstellung und Grammatik.'
      : '';
  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nEinziger erlaubter Originalbeleg:\n${evidenceText}\n\n${guidance}\nFormuliere genau EINEN vollständigen Satz mit höchstens ${length.microWords} Wörtern. Inhalt und Umfang müssen gleich bleiben.${strictText}`;
}

function buildVerifierPrompt(evidenceText, candidate) {
  return `Originalbeleg:\n${evidenceText}\n\nHEB-Satz:\n${candidate}\n\nIst der HEB-Satz vollständig durch den Originalbeleg gedeckt, ohne Bedeutungsverschiebung oder neue Tatsache?`;
}

async function runMicroWriter(engine, prompt, strictLevel = 0) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: WRITER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 0.9,
    repetition_penalty: strictLevel >= 2 ? 1.08 : strictLevel === 1 ? 1.10 : 1.05,
    max_tokens: strictLevel >= 2 ? 56 : strictLevel === 1 ? 64 : 72,
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

async function runMicroVerifier(engine, evidenceText, candidate) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: VERIFIER_SYSTEM },
      { role: 'user', content: buildVerifierPrompt(evidenceText, candidate) },
    ],
    temperature: 0,
    top_p: 1,
    repetition_penalty: 1,
    max_tokens: 6,
  });
  const verdict = normalizeOutput(response?.choices?.[0]?.message?.content || '').toUpperCase();
  return /^JA\b/.test(verdict);
}

function onlyLexicalUncertainty(reasons) {
  return reasons.length > 0 && reasons.every((reason) => reason.startsWith('nicht belegte Inhaltswörter'));
}

function sourceCanBeUsedVerbatim(evidenceText, maxWords) {
  const source = normalizeOutput(evidenceText);
  if (!source || wordCount(source) > maxWords + 6) return false;
  const validation = validateAnchoredHebText(source, [source], { maxWords });
  return validation.ok;
}

async function generateMicroSentence(engine, context, evidenceText) {
  const length = getLengthProfile(context.formType, context.sectionMode);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const text = await runMicroWriter(
      engine,
      buildMicroPrompt({ ...context, evidenceText, strictLevel: attempt }),
      attempt,
    );

    const validation = validateAnchoredHebText(text, [evidenceText], { maxWords: length.microWords });
    if (validation.ok) return text;

    // Die zweite KI-Prüfung wird nur bei rein lexikalischer Unsicherheit eingesetzt.
    // Harte Fehler wie erfundene Ursachen, Scope-Verschiebung oder kaputte Grammatik
    // dürfen dadurch niemals überstimmt werden.
    if (onlyLexicalUncertainty(validation.reasons)) {
      const verified = await runMicroVerifier(engine, evidenceText, text);
      if (verified) return text;
    }
  }

  // Transparente Sicherheitsstufe: kein erfundener Fallback. Wenn die KI denselben
  // Inhalt nicht zuverlässig umformulieren kann, darf nur der Originalbeleg selbst
  // unverändert übernommen werden.
  if (sourceCanBeUsedVerbatim(evidenceText, length.maxWords)) {
    return normalizeOutput(evidenceText);
  }

  return '';
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
    if (wordCount(candidate) > maxWords + 6) continue;
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
    try {
      const sentence = await generateMicroSentence(engine, context, evidenceText);
      if (sentence) microSentences.push(sentence);
    } catch {
      // Ein einzelner misslungener Mikrosatz darf keinen gesamten HEB zerstören.
      // Es wird aber auch kein Ersatzinhalt erzeugt.
    }
  }

  const combined = combineMicroSentences(microSentences, length.maxWords);
  return combined || UNSAFE_TEXT;
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
          ? `KI formuliert und prüft ${index + 1}/${sections.length} …`
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
    if (!finalText) {
      const error = new Error('Es konnte kein sicherer HEB-Entwurf erstellt werden.');
      error.code = 'QUALITY_REJECTED';
      throw error;
    }

    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    return finalText;
  } catch (error) {
    if (engineInstance) setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    throw error;
  }
}

export function getModelInfo() {
  return modelInfo;
}
