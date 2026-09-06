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
const MODEL_PROFILE = 'webllm-llama32-1b-section-selector-v6-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';
const UNSAFE_TEXT = 'Die vorhandenen Angaben konnten für diesen Unterpunkt nicht sicher formuliert werden.';

// Architektur v6
// ----------------
// Kleine lokale Modelle waren mit einer einzigen mehrzeiligen Gesamtzuordnung
// unzuverlässig. Deshalb wird jetzt jeder offizielle HEB-Unterpunkt einzeln
// bearbeitet:
// 1) Die lokale KI wählt für genau EINEN Unterpunkt nur vorhandene Quellen-IDs.
// 2) Jede ausgewählte Originalaussage wird einzeln formuliert.
// 3) Harte lokale Prüfungen blockieren bekannte Bedeutungsverschiebungen.
// 4) Jede echte Umformulierung wird zusätzlich von der lokalen KI gegen genau
//    diesen Originalbeleg auf Faktentreue geprüft.
// 5) Wenn die KI keine sichere Verbesserung findet, wird sie ausdrücklich
//    angewiesen, den Originalsatz selbst unverändert auszugeben.
// 6) Ein einzelner nicht sicher formulierbarer Unterpunkt zerstört nie mehr den
//    gesamten HEB-Entwurf. Es gibt keinen regelbasierten Ersatz-HEB.

const SELECTOR_SYSTEM = `Du wählst ausschließlich Quellen-IDs für genau einen offiziellen HEB-Unterpunkt aus.
Erfinde nichts und schreibe keinen HEB-Text.
Verwende nur IDs, die in der Liste tatsächlich vorkommen.
Antworte ausschließlich mit passenden IDs, durch Komma getrennt, oder mit NONE.
Eine konkrete aktuelle Situations- oder Ressourcenaussage gehört bei HEB A in current.
Ein Unterstützungsbedarf gehört nur in support, wenn die Quelle tatsächlich Hilfe, Unterstützung, Erinnerung, Impuls, Begleitung oder vergleichbaren Bedarf beschreibt.
Ein Ziel gehört nur in goals, wenn die Quelle ausdrücklich einen Wunsch, ein Ziel oder einen zukünftigen Soll-Zustand nennt.
Eine Maßnahme gehört nur in measures, wenn die Quelle eine konkrete Unterstützung oder Handlung beschreibt, die tatsächlich erfolgt oder vorgesehen ist.`;

const WRITER_SYSTEM = `Du formulierst genau einen kurzen professionellen Satz für die sozialpsychiatrische Eingliederungshilfe.
Du bekommst genau einen Originalbeleg. Verwende ausschließlich dessen Inhalt.
Du darfst Grammatik, Satzstellung und fachlich neutrale Begriffe verbessern, aber keine neue Tatsache ergänzen.
Verboten sind neue Diagnosen, Symptome, Ursachen, Motive, Bewertungen, Fähigkeiten, Risiken, Entwicklungen, Ziele, Maßnahmen oder Anbieter.
Unterstützung beim Beginn darf nicht zu Unterstützung bei der Durchführung werden.
Vorhandene Selbstständigkeit darf nicht abgeschwächt werden.
Keine moralischen Bewertungen, keine Liste, kein Markdown, kein Ausrufezeichen, keine Meta-Kommentare.
Schreibe korrektes, natürliches, sachliches und ressourcenorientiertes Deutsch.
Wenn du keine sichere bessere Formulierung findest, gib den Originalbeleg unverändert aus.
Gib nur genau einen vollständigen Satz aus.`;

const VERIFIER_SYSTEM = `Du prüfst nur Faktentreue zwischen genau einem Originalbeleg und genau einem HEB-Satz.
Antworte JA nur dann, wenn jede Tatsachenaussage vollständig durch den Originalbeleg gedeckt ist und Umfang, Ursache, Selbstständigkeit sowie Unterstützungsbedarf nicht verändert wurden.
Antworte NEIN bei jeder neuen Tatsache, Ursache, Diagnose, Einschränkung, Fähigkeit, Maßnahme, Ziel, Entwicklung oder Bewertung.
Stilistische Umformulierungen ohne neue Tatsache sind erlaubt.
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
    current: { maxWords: 52, maxEvidence: 4, microWords: 24 },
    support: { maxWords: 34, maxEvidence: 2, microWords: 21 },
    goals: { maxWords: 28, maxEvidence: 1, microWords: 24 },
    measures: { maxWords: 38, maxEvidence: 2, microWords: 22 },
  },
  B: {
    reflection: { maxWords: 44, maxEvidence: 2, microWords: 23 },
    development: { maxWords: 52, maxEvidence: 3, microWords: 23 },
    support: { maxWords: 34, maxEvidence: 2, microWords: 21 },
    goals: { maxWords: 28, maxEvidence: 1, microWords: 24 },
    measures: { maxWords: 38, maxEvidence: 2, microWords: 22 },
  },
  C: {
    reflection: { maxWords: 44, maxEvidence: 2, microWords: 23 },
    development: { maxWords: 50, maxEvidence: 3, microWords: 22 },
    remainingSupport: { maxWords: 34, maxEvidence: 2, microWords: 21 },
    furtherMeasures: { maxWords: 36, maxEvidence: 2, microWords: 21 },
    provider: { maxWords: 18, maxEvidence: 1, microWords: 18 },
  },
};

const SELECTION_GUIDANCE = {
  current: 'Wähle konkrete aktuelle Situationen, Schwierigkeiten, Ressourcen und vorhandene Selbstständigkeit. Unterstützungsbedarf darf zusätzlich vorkommen.',
  support: 'Wähle nur Aussagen, die tatsächlich einen Hilfebedarf oder eine notwendige Unterstützung erkennen lassen.',
  goals: 'Wähle nur ausdrücklich genannte Ziele, Wünsche oder zukünftige Soll-Zustände.',
  measures: 'Wähle nur konkrete Unterstützungen oder Handlungen, die tatsächlich beschrieben oder ausdrücklich vorgesehen sind.',
  reflection: 'Wähle nur Aussagen zu tatsächlich durchgeführten Maßnahmen und nur ausdrücklich beschriebenem Verlauf oder Ergebnis.',
  development: 'Wähle nur Aussagen mit erkennbarem zeitlichem Vergleich, Entwicklung, Stabilität oder Verschlechterung.',
  remainingSupport: 'Wähle nur ausdrücklich noch bestehenden Hilfebedarf.',
  furtherMeasures: 'Wähle nur ausdrücklich vorgesehene weitere Maßnahmen.',
  provider: 'Wähle nur Aussagen, in denen ausdrücklich steht, wer eine weitere Maßnahme erbringt.',
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
        pipeline: 'Unterpunktweise Quellenwahl mit beleggebundener Mikro-Generierung',
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
  return SECTION_LENGTHS[formType]?.[sectionMode] || { maxWords: 36, maxEvidence: 2, microWords: 21 };
}

function shouldSkipSectionSelection(formType, sectionMode, notes) {
  if ((formType === 'A' || formType === 'B') && sectionMode === 'goals' && !hasGoalEvidence(notes)) return true;
  if ((formType === 'B' || formType === 'C') && sectionMode === 'development' && !hasDevelopmentEvidence(notes)) return true;
  return false;
}

function buildSelectorPrompt({ units, formType, area, sectionMode, sectionLabel, maxEvidence, strict }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const guide = SELECTION_GUIDANCE[sectionMode] || 'Wähle nur unmittelbar passende Aussagen.';
  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\n${guide}\n\nOriginalquellen:\n${evidenceCatalog(units)}\n\nWähle höchstens ${maxEvidence} passende Quellen-IDs.${strict ? ' Antworte exakt nur mit IDs wie S1,S3 oder NONE.' : ' Keine Begründung, kein Fließtext.'}`;
}

async function runSectionSelector(engine, prompt, strict = false) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: SELECTOR_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    repetition_penalty: 1,
    max_tokens: strict ? 20 : 28,
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

function parseSectionIds(raw, sectionMode, units, maxEvidence) {
  const map = parseEvidenceClassification(
    `${sectionMode}=${raw}`,
    [sectionMode],
    units,
    { [sectionMode]: maxEvidence },
  );
  return map[sectionMode] || [];
}

async function selectEvidenceForSection(engine, context) {
  const { notes, units, formType, area, sectionMode, sectionLabel, onProgress } = context;
  const maxEvidence = getLengthProfile(formType, sectionMode).maxEvidence;

  if (shouldSkipSectionSelection(formType, sectionMode, notes)) return [];

  setModelState({
    status: 'generating',
    percent: 100,
    text: `KI ordnet Angaben für ${sectionLabel.slice(0, 2)} zu …`,
    error: null,
  }, onProgress);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const strict = attempt === 1;
    const raw = await runSectionSelector(
      engine,
      buildSelectorPrompt({ units, formType, area, sectionMode, sectionLabel, maxEvidence, strict }),
      strict,
    );
    const ids = parseSectionIds(raw, sectionMode, units, maxEvidence);
    if (ids.length) return ids;

    const explicitNone = /\b(?:NONE|KEINE|KEIN)\b/i.test(raw);
    // Für aktuelle Situationsfelder erzwingen wir einen zweiten KI-Versuch, weil
    // dort bei einer konkreten Eingabe normalerweise mindestens ein Beleg passt.
    const requiresRetry = sectionMode === 'current' || sectionMode === 'reflection' || sectionMode === 'development';
    if (explicitNone && !requiresRetry) return [];
  }

  // Kein technischer Fehler und kein regelbasierter Ersatz: dieser Unterpunkt
  // bleibt transparent ohne sicher ausgewählte Quelle.
  return [];
}

function buildMicroPrompt({ formType, area, sectionMode, sectionLabel, evidenceText, strictLevel = 0 }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const length = getLengthProfile(formType, sectionMode);
  const guidance = WRITING_GUIDANCE[sectionMode] || '';
  const strictText = strictLevel === 1
    ? '\nBleibe sehr nah am Originalwortlaut. Tausche keine inhaltstragenden Begriffe aus.'
    : strictLevel >= 2
      ? '\nWenn eine sichere Umformulierung nicht möglich ist, gib den Originalbeleg EXAKT und vollständig unverändert aus.'
      : '';

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nEinziger erlaubter Originalbeleg:\n${evidenceText}\n\n${guidance}\nFormuliere genau EINEN vollständigen Satz mit höchstens ${length.microWords} Wörtern. Inhalt und Umfang müssen vollständig gleich bleiben.${strictText}`;
}

function buildVerifierPrompt(evidenceText, candidate) {
  return `Originalbeleg:\n${evidenceText}\n\nHEB-Satz:\n${candidate}\n\nIst jede Tatsachenaussage des HEB-Satzes vollständig durch den Originalbeleg gedeckt und in ihrer Bedeutung unverändert?`;
}

async function runMicroWriter(engine, prompt, strictLevel = 0) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: WRITER_SYSTEM },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    top_p: 1,
    repetition_penalty: strictLevel === 1 ? 1.04 : 1,
    max_tokens: strictLevel >= 2 ? 72 : 80,
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

function normalizedComparable(text) {
  return normalizeOutput(text).toLocaleLowerCase('de-DE');
}

async function generateMicroSentence(engine, context, evidenceText) {
  const length = getLengthProfile(context.formType, context.sectionMode);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await runMicroWriter(
      engine,
      buildMicroPrompt({ ...context, evidenceText, strictLevel: attempt }),
      attempt,
    );
    if (!candidate) continue;

    const hardCheck = validateAnchoredHebText(candidate, [evidenceText], { maxWords: length.microWords });
    if (!hardCheck.ok) continue;

    // Ein vom Modell exakt wiedergegebener Originalbeleg ist per Definition
    // vollständig quellengetreu. Jede echte Umformulierung braucht die zweite
    // semantische KI-Gegenprüfung.
    if (normalizedComparable(candidate) === normalizedComparable(evidenceText)) return candidate;

    const verified = await runMicroVerifier(engine, evidenceText, candidate);
    if (verified) return candidate;
  }

  return '';
}

function combineMicroSentences(sentences, maxWords) {
  const chosen = [];
  const seen = new Set();

  for (const raw of sentences) {
    const sentence = normalizeOutput(raw);
    if (!sentence) continue;
    const key = sentence.toLocaleLowerCase('de-DE');
    if (seen.has(key)) continue;

    const candidate = [...chosen, sentence].join(' ');
    if (wordCount(candidate) > maxWords + 4) continue;
    seen.add(key);
    chosen.push(sentence);
  }

  return chosen.join(' ').trim();
}

async function formulateSelectedEvidence(engine, context, evidenceTexts) {
  if (!evidenceTexts.length) return MISSING_TEXT;

  const length = getLengthProfile(context.formType, context.sectionMode);
  const microSentences = [];
  let runtimeFailure = null;

  for (const evidenceText of evidenceTexts.slice(0, length.maxEvidence)) {
    try {
      const sentence = await generateMicroSentence(engine, context, evidenceText);
      if (sentence) microSentences.push(sentence);
    } catch (error) {
      runtimeFailure = error;
    }
  }

  const combined = combineMicroSentences(microSentences, length.maxWords);
  if (combined) return combined;

  if (runtimeFailure) {
    const error = new Error(`Technischer Fehler bei der lokalen KI in ${context.sectionLabel}: ${runtimeFailure?.message || runtimeFailure}`);
    error.code = 'GENERATION_RUNTIME_ERROR';
    throw error;
  }

  return UNSAFE_TEXT;
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
    const outputs = [];

    for (let index = 0; index < sections.length; index += 1) {
      const [sectionMode, sectionLabel] = sections[index];
      const selectedIds = await selectEvidenceForSection(engine, {
        notes,
        units,
        formType,
        area,
        sectionMode,
        sectionLabel,
        onProgress,
      });
      const evidenceTexts = getEvidenceTexts(units, selectedIds);

      setModelState({
        status: 'generating',
        percent: 100,
        text: evidenceTexts.length
          ? `KI formuliert und prüft ${index + 1}/${sections.length} …`
          : `KI prüft ${index + 1}/${sections.length} …`,
        error: null,
      }, onProgress);

      const sectionText = await formulateSelectedEvidence(engine, {
        formType,
        area,
        sectionMode,
        sectionLabel,
      }, evidenceTexts);

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
