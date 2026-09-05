import { HEB_FORM_CONFIG, getOutputInstruction } from './heb-knowledge.js';

// Low-memory multilingual model for iOS/Safari. HEB Assist is a social-
// psychiatric documentation aid, not a nursing documentation generator.
const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const MODEL_KEY = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Llama 3.2 1B Instruct';
const MODEL_PROFILE = 'webllm-llama32-1b-q4f16-ctx1024';
const CONTEXT_WINDOW_SIZE = 1024;

const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';

const CORE_RULES = `Du bist HEB Assist. Du formulierst professionelle HEB-Texte für die sozialpsychiatrische Eingliederungshilfe.

Verbindliche Regeln:
- Nutze ausschließlich Angaben aus der Fallbeschreibung. Nichts erfinden, vermuten oder fachlich dazudichten.
- HEB Assist ist kein Pflegebericht. Verwende pflegerische oder medizinische Begriffe nur, wenn sie in der Fallbeschreibung tatsächlich vorkommen und für den gewählten HEB-Bereich relevant sind.
- Im Bereich Selbstversorgung / Wohnen können z. B. Haushaltsführung, Einkaufen, Finanzen, Wohnraum, Alltagsorganisation und eigenständige Lebensführung relevant sein. Körperpflege darf niemals automatisch angenommen werden.
- Alltagsformulierungen sind verwertbare Angaben; sie müssen nicht ausdrücklich als Ressource oder Hilfebedarf bezeichnet sein.
- Keine Diagnosen, Ursachen, Symptome, Risiken, Fähigkeiten, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfe oder Anbieter ergänzen, die nicht aus der Eingabe hervorgehen.
- Ziele nur formulieren, wenn aus der Eingabe tatsächlich eine Zielrichtung, ein Wunsch oder eine zukünftige Absicht hervorgeht. Eine bloße Problembeschreibung ist noch kein Ziel.
- Maßnahmen nur formulieren, wenn eine konkrete Unterstützungsform beschrieben oder ausdrücklich vorgesehen ist.
- Schreibe korrektes, natürliches, professionelles Deutsch: sachlich, wertschätzend, ressourcenorientiert und personenzentriert.
- Verwende „die Person“ oder „die leistungsberechtigte Person“ und keine Namen.
- Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt wurde.
- Keine Überschriften, Listen, Nummerierungen, Markdown, Fantasiewörter, künstlichen Fachbegriffe oder Meta-Kommentare in der eigentlichen Antwort.
- Wiederhole die Fallbeschreibung nicht vollständig. Verdichte nur die für den angeforderten Unterpunkt relevanten Informationen.
- Antworte nur mit dem fertigen Fließtext für genau den angeforderten HEB-Unterpunkt.
- Jeder ausgegebene Text muss mit einem vollständigen Satz enden. Niemals mitten im Wort oder Satz abbrechen.
- Wenn die Informationen für diesen Unterpunkt wirklich fehlen, antworte exakt: „${MISSING_TEXT}“`;

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

// Zielwerte orientieren sich an den unterschiedlich großen Textfeldern der
// HEB-Bögen. Die KI soll verdichten; die technische Token-Grenze liegt bewusst
// höher, damit der letzte Satz vollständig beendet werden kann.
const SECTION_LENGTHS = {
  A: {
    current: { maxWords: 46, sentences: '2 bis 3' },
    support: { maxWords: 34, sentences: '1 bis 2' },
    goals: { maxWords: 28, sentences: '1 bis 2' },
    measures: { maxWords: 36, sentences: '1 bis 2' },
  },
  B: {
    reflection: { maxWords: 44, sentences: '2 bis 3' },
    development: { maxWords: 50, sentences: '2 bis 3' },
    support: { maxWords: 32, sentences: '1 bis 2' },
    goals: { maxWords: 28, sentences: '1 bis 2' },
    measures: { maxWords: 36, sentences: '1 bis 2' },
  },
  C: {
    reflection: { maxWords: 44, sentences: '2 bis 3' },
    development: { maxWords: 48, sentences: '2 bis 3' },
    remainingSupport: { maxWords: 32, sentences: '1 bis 2' },
    furtherMeasures: { maxWords: 34, sentences: '1 bis 2' },
    provider: { maxWords: 18, sentences: '1' },
  },
};

const GUIDANCE = {
  current: 'Verdichte die aktuelle Alltagssituation. Stelle die wichtigsten Ressourcen und Schwierigkeiten nachvollziehbar gegenüber. Nenne nur Unterstützung, die zum Verständnis der Situation nötig ist.',
  support: 'Beschreibe knapp, wobei Unterstützung nötig ist und was selbstständig gelingt. Keine Fallbeschreibung wiederholen und keine Hilfebedarfsstufe wählen.',
  goals: `Formuliere nur eine tatsächlich genannte oder eindeutig als Zukunftswunsch beschriebene Zielrichtung. Wenn kein Ziel oder Wunsch genannt ist, antworte exakt: „${MISSING_TEXT}“`,
  measures: `Nenne ausschließlich bereits beschriebene oder ausdrücklich geplante Unterstützungsformen. Wenn keine konkrete Unterstützungsform erkennbar ist, antworte exakt: „${MISSING_TEXT}“`,
  reflection: `Reflektiere nur tatsächlich genannte durchgeführte Maßnahmen und deren beschriebenen Verlauf oder Wirkung. Fehlen Verlauf oder Maßnahmen, antworte exakt: „${MISSING_TEXT}“`,
  development: `Beschreibe nur ausdrücklich erkennbare Entwicklung, Stabilität oder Verschlechterung im Zeitraum. Ohne zeitlichen Vergleich antworte exakt: „${MISSING_TEXT}“`,
  remainingSupport: 'Beschreibe ausschließlich den ausdrücklich noch bestehenden Unterstützungsbedarf. Keine Hilfebedarfsstufe ergänzen.',
  furtherMeasures: `Nenne nur ausdrücklich vorgesehene weitere Maßnahmen. Fehlen diese, antworte exakt: „${MISSING_TEXT}“`,
  provider: `Nenne nur den ausdrücklich genannten Erbringer. Fehlt diese Information, antworte exakt: „${MISSING_TEXT}“`,
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
    // Browser-Persistenz ist eine Optimierung und darf den Start nicht blockieren.
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

function getLengthProfile(formType, sectionMode) {
  return SECTION_LENGTHS[formType]?.[sectionMode] || { maxWords: 36, sentences: '1 bis 2' };
}

function buildSectionPrompt({ notes, area, formType, sectionMode, sectionLabel, strictRetry = false }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const instruction = getOutputInstruction(formType, sectionMode);
  const guidance = GUIDANCE[sectionMode] || '';
  const length = getLengthProfile(formType, sectionMode);
  const retryHint = strictRetry
    ? '\nDie vorige Antwort war unvollständig, zu lang oder sprachlich unbrauchbar. Formuliere deutlich kompakter und beende jeden Satz vollständig.'
    : '';

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nAufgabe: ${instruction}\n${guidance}\n\nFallbeschreibung:\n${notes}\n\nFormuliere ausschließlich den Inhalt dieses Unterpunkts. Verdichte statt zu wiederholen. Umfang: ${length.sentences} vollständige Sätze, höchstens ${length.maxWords} Wörter. Der letzte Satz muss vollständig mit Satzzeichen enden. Keine Überschrift, keine Liste, keine Nummerierung und kein Markdown.${retryHint}`;
}

function normalizeOutput(text) {
  return String(text || '')
    .replace(/<\|im_start\|>|<\|im_end\|>|<bos>|<eos>/gi, '')
    .replace(/^assistant\s*:?\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function wordCount(text) {
  return (normalizeOutput(text).match(/\S+/g) || []).length;
}

function endsWithCompleteSentence(text) {
  const cleaned = normalizeOutput(text);
  if (!cleaned) return false;
  return /[.!?…][”"']?$/.test(cleaned);
}

function isMissingOutput(text) {
  const cleaned = normalizeOutput(text).replace(/[.!]+$/g, '').trim().toLowerCase();
  return [
    'hierzu liegen keine ausreichenden angaben vor',
    'hierzu liegt keine ausreichende angabe vor',
    'hierzu liegt keine angabe vor',
  ].includes(cleaned);
}

function hasSupportEvidence(notes) {
  return /\b(benötig\w*|unterstütz\w*|erinner\w*|impuls\w*|gemeinsam|begleit\w*|anleit\w*|hilfe\w*|hilfestell\w*|struktur\w*|angebot\w*)\b/i.test(notes);
}

function hasGoalEvidence(notes) {
  return /\b(ziel\w*|soll\w*|möchte\w*|wunsch\w*|angestrebt\w*|erhalten\w*|stabilisier\w*|weiterentwick\w*|verbesser\w*|förder\w*|künftig\w*|zukünftig\w*)\b/i.test(notes);
}

function shouldContainContent({ notes, formType, sectionMode }) {
  const value = String(notes || '').trim();
  if (!value) return false;
  if (formType === 'A') {
    if (sectionMode === 'current') return true;
    if (sectionMode === 'support' || sectionMode === 'measures') return hasSupportEvidence(value);
    if (sectionMode === 'goals') return hasGoalEvidence(value);
  }
  if (sectionMode === 'remainingSupport') return hasSupportEvidence(value);
  return false;
}

function mustBeMissing({ notes, formType, sectionMode }) {
  const value = String(notes || '').trim();
  if (!value) return true;
  if (formType === 'A' && sectionMode === 'goals') return !hasGoalEvidence(value);
  return false;
}

function isDegenerateOutput(text) {
  const cleaned = normalizeOutput(text);
  if (!cleaned) return true;
  if (/\bHEBI?[-:]|HEB-(?:Bereich|Reise|Bereit|Beispiel)|Abstand\s*100\s*%/i.test(cleaned)) return true;
  if (/\b(?:[A-Za-zÄÖÜäöüß]+-){3,}[A-Za-zÄÖÜäöüß]+\b/.test(cleaned)) return true;
  if (/\*\*|^\s*(?:\d+[.)]|[-*•])\s+/m.test(cleaned)) return true;
  if (/\bVerbraucher(?:einrichtung|einsprung)\b/i.test(cleaned)) return true;

  const lines = cleaned.split(/\n+/).map((line) => line.trim().toLowerCase()).filter(Boolean);
  if (new Set(lines).size !== lines.length) return true;

  const words = cleaned.toLowerCase().match(/[a-zäöüß0-9-]+/g) || [];
  if (words.length >= 12) {
    const counts = new Map();
    for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
    const maxCount = Math.max(...counts.values());
    if (maxCount >= 6 || counts.size / words.length < 0.36) return true;
  }
  return false;
}

function extractCompleteSentences(text) {
  const cleaned = normalizeOutput(text);
  return cleaned.match(/[^.!?…]+[.!?…]+(?:[”"'](?=\s|$))?/g)?.map((sentence) => sentence.trim()) || [];
}

function compactToProfile(text, context) {
  const cleaned = normalizeOutput(text);
  if (!cleaned || isMissingOutput(cleaned) || isDegenerateOutput(cleaned)) return cleaned;

  const { maxWords } = getLengthProfile(context.formType, context.sectionMode);
  const sentences = extractCompleteSentences(cleaned);
  if (!sentences.length) return cleaned;

  const chosen = [];
  for (const sentence of sentences) {
    const candidate = [...chosen, sentence].join(' ');
    if (wordCount(candidate) <= maxWords + 6) {
      chosen.push(sentence);
      continue;
    }
    break;
  }

  if (chosen.length) return chosen.join(' ').trim();
  return cleaned;
}

function isSectionInvalid(text, context) {
  const cleaned = normalizeOutput(text);
  const length = getLengthProfile(context.formType, context.sectionMode);
  if (isDegenerateOutput(cleaned)) return true;
  if (mustBeMissing(context) && !isMissingOutput(cleaned)) return true;
  if (!isMissingOutput(cleaned) && !endsWithCompleteSentence(cleaned)) return true;
  if (!isMissingOutput(cleaned) && wordCount(cleaned) > length.maxWords + 8) return true;
  if (shouldContainContent(context) && isMissingOutput(cleaned)) return true;
  return false;
}

function makeQualityError() {
  const error = new Error('Die KI-Ausgabe hat die Qualitätsprüfung nicht bestanden und wurde verworfen.');
  error.code = 'QUALITY_REJECTED';
  return error;
}

async function runSection(engine, prompt, strictRetry = false) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: CORE_RULES },
      { role: 'user', content: prompt },
    ],
    temperature: strictRetry ? 0 : 0.05,
    top_p: 0.9,
    repetition_penalty: strictRetry ? 1.16 : 1.08,
    max_tokens: strictRetry ? 152 : 168,
  });

  return {
    text: normalizeOutput(response?.choices?.[0]?.message?.content || ''),
    finishReason: response?.choices?.[0]?.finish_reason || null,
  };
}

async function generateSection(engine, baseContext) {
  let prompt = buildSectionPrompt({ ...baseContext, strictRetry: false });
  let result = await runSection(engine, prompt, false);
  let text = compactToProfile(result.text, baseContext);
  if (!isSectionInvalid(text, baseContext)) return text;

  prompt = buildSectionPrompt({ ...baseContext, strictRetry: true });
  result = await runSection(engine, prompt, true);
  text = compactToProfile(result.text, baseContext);
  if (!isSectionInvalid(text, baseContext)) return text;

  throw makeQualityError();
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  const engine = await loadEngine(onProgress);
  const sections = SECTION_MODES[formType] || SECTION_MODES.A;
  const outputs = [];

  try {
    for (let index = 0; index < sections.length; index += 1) {
      const [sectionMode, sectionLabel] = sections[index];
      setModelState({
        status: 'generating',
        percent: 100,
        text: `KI formuliert ${index + 1}/${sections.length} …`,
        error: null,
      }, onProgress);

      const sectionText = await generateSection(engine, {
        notes,
        area,
        formType,
        sectionMode,
        sectionLabel,
      });
      outputs.push(`${sectionLabel}\n${sectionText}`);
    }
  } catch (error) {
    if (engineInstance) {
      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    }
    throw error;
  }

  const finalText = outputs.join('\n\n').trim();
  if (!finalText) throw makeQualityError();

  setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
  return finalText;
}

export function getModelInfo() {
  return modelInfo;
}
