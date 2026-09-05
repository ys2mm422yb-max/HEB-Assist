import { HEB_FORM_CONFIG } from './heb-knowledge.js';

// Lokales, speicherschonendes Sprachmodell für iOS/Safari.
const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const MODEL_KEY = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Llama 3.2 1B Instruct';
const MODEL_PROFILE = 'webllm-llama32-1b-q4f16-ctx2048';
// 1024 Tokens waren für Systemregeln + Falltext + Ausgabe zu knapp. 2048 bleibt
// deutlich unter dem vom Modell unterstützten 4096er Kontext und reduziert das
// Risiko von Kontextfehlern bei realistischen HEB-Eingaben.
const CONTEXT_WINDOW_SIZE = 2048;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';

const CORE_RULES = `Du bist HEB Assist für die sozialpsychiatrische Eingliederungshilfe.
Schreibe professionelles, natürliches, sachliches und ressourcenorientiertes Deutsch.
Nutze ausschließlich Angaben aus der Fallbeschreibung. Erfinde keine Diagnosen, Ursachen, Symptome, Ressourcen, Fähigkeiten, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfe oder Anbieter.
Pflege- oder medizinische Inhalte nur verwenden, wenn sie in der Eingabe tatsächlich genannt und für den gewählten HEB-Bereich relevant sind.
Alltagsformulierungen dürfen fachlich verdichtet werden. Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
Keine formale Hilfebedarfsstufe ergänzen, wenn sie nicht ausdrücklich genannt ist.
Keine Überschriften, Listen, Nummerierungen, Markdown, Fantasiewörter oder Meta-Kommentare ausgeben.
Wiederhole die Fallbeschreibung nicht vollständig. Gib nur den fertigen Fließtext des angeforderten Unterpunkts aus.
Ziele nur bei tatsächlich genannter Zielrichtung, Wunsch oder Zukunftsabsicht formulieren. Maßnahmen nur bei beschriebener oder ausdrücklich geplanter Unterstützung.
Fehlen die nötigen Angaben, antworte exakt: „${MISSING_TEXT}“`;

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

// Kompakte Zielgrößen passend zu den unterschiedlich großen Feldern der HEB-Bögen.
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
  current: 'Verdichte aktuelle Situation, Schwierigkeiten und vorhandene Ressourcen. Nur relevante Unterstützung erwähnen.',
  support: 'Beschreibe knapp, was selbstständig gelingt und wobei konkret Unterstützung nötig ist. Keine Hilfebedarfsstufe wählen.',
  goals: `Nur eine ausdrücklich genannte Zielrichtung, einen Wunsch oder eine Zukunftsabsicht formulieren. Fehlt dies: „${MISSING_TEXT}“`,
  measures: `Nur bereits beschriebene oder ausdrücklich geplante Unterstützungsformen nennen. Fehlen diese: „${MISSING_TEXT}“`,
  reflection: `Nur tatsächlich durchgeführte Maßnahmen und deren beschriebenen Verlauf oder Wirkung reflektieren. Fehlen Angaben: „${MISSING_TEXT}“`,
  development: `Nur ausdrücklich erkennbare Entwicklung, Stabilität oder Verschlechterung beschreiben. Ohne zeitlichen Vergleich: „${MISSING_TEXT}“`,
  remainingSupport: 'Nur den ausdrücklich noch bestehenden Unterstützungsbedarf beschreiben. Keine Hilfebedarfsstufe ergänzen.',
  furtherMeasures: `Nur ausdrücklich vorgesehene weitere Maßnahmen nennen. Fehlen diese: „${MISSING_TEXT}“`,
  provider: `Nur den ausdrücklich genannten Erbringer nennen. Fehlt er: „${MISSING_TEXT}“`,
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

function isMissingOutput(text) {
  const cleaned = normalizeOutput(text).replace(/[.!]+$/g, '').trim().toLowerCase();
  return [
    'hierzu liegen keine ausreichenden angaben vor',
    'hierzu liegt keine ausreichende angabe vor',
    'hierzu liegt keine angabe vor',
  ].includes(cleaned);
}

function endsWithCompleteSentence(text) {
  const cleaned = normalizeOutput(text);
  return Boolean(cleaned) && /[.!?…][”"']?$/.test(cleaned);
}

function hasSupportEvidence(notes) {
  return /\b(benötig\w*|unterstütz\w*|erinner\w*|impuls\w*|gemeinsam|begleit\w*|anleit\w*|hilfe\w*|hilfestell\w*|struktur\w*|angebot\w*)\b/i.test(notes);
}

function hasGoalEvidence(notes) {
  return /\b(ziel\w*|soll\w*|möchte\w*|wunsch\w*|angestrebt\w*|erhalten\w*|stabilisier\w*|weiterentwick\w*|verbesser\w*|förder\w*|künftig\w*|zukünftig\w*)\b/i.test(notes);
}

function sectionCanBeResolvedWithoutGeneration({ notes, formType, sectionMode }) {
  const value = String(notes || '').trim();
  if (!value) return MISSING_TEXT;
  // Bei HEB A darf aus einer bloßen Situationsbeschreibung kein Ziel erfunden werden.
  if (formType === 'A' && sectionMode === 'goals' && !hasGoalEvidence(value)) return MISSING_TEXT;
  return null;
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
    if (wordCount(candidate) <= maxWords + 6) chosen.push(sentence);
    else break;
  }
  return chosen.length ? chosen.join(' ').trim() : cleaned;
}

function isSectionInvalid(text, context) {
  const cleaned = normalizeOutput(text);
  const { maxWords } = getLengthProfile(context.formType, context.sectionMode);
  if (isDegenerateOutput(cleaned)) return true;
  if (!isMissingOutput(cleaned) && !endsWithCompleteSentence(cleaned)) return true;
  if (!isMissingOutput(cleaned) && wordCount(cleaned) > maxWords + 8) return true;
  if (shouldContainContent(context) && isMissingOutput(cleaned)) return true;
  return false;
}

function buildSectionPrompt(context, compact = false) {
  const form = HEB_FORM_CONFIG[context.formType] || HEB_FORM_CONFIG.A;
  const length = getLengthProfile(context.formType, context.sectionMode);
  const guidance = GUIDANCE[context.sectionMode] || '';

  if (compact) {
    return `HEB ${context.formType}, Bereich: ${context.area}\nUnterpunkt: ${context.sectionLabel}\n${guidance}\nFallbeschreibung: ${context.notes}\nSchreibe nur ${length.sentences} vollständige Sätze, höchstens ${length.maxWords} Wörter. Nur belegbare Angaben; keine Liste oder Überschrift.`;
  }

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${context.area}\nUnterpunkt: ${context.sectionLabel}\n\n${guidance}\n\nFallbeschreibung:\n${context.notes}\n\nFormuliere ausschließlich diesen Unterpunkt als ${length.sentences} vollständige Sätze mit höchstens ${length.maxWords} Wörtern. Verdichte statt zu wiederholen. Keine Überschrift, Liste, Nummerierung oder Markdown.`;
}

function makeQualityError() {
  const error = new Error('Die KI-Ausgabe hat die Qualitätsprüfung nicht bestanden und wurde verworfen.');
  error.code = 'QUALITY_REJECTED';
  return error;
}

function makeRuntimeError(error) {
  const message = error?.message || String(error) || 'Unbekannter Laufzeitfehler';
  const wrapped = new Error(`Technischer Fehler bei der lokalen KI: ${message}`);
  wrapped.code = 'GENERATION_RUNTIME_ERROR';
  return wrapped;
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
    repetition_penalty: strictRetry ? 1.14 : 1.08,
    // Für die kompakten HEB-Felder reichen diese Budgets; kleineres Decode-Budget
    // schont iOS-Speicher und lässt mehr Platz im Kontext für den Falltext.
    max_tokens: strictRetry ? 112 : 128,
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

async function generateSection(engine, context) {
  const resolved = sectionCanBeResolvedWithoutGeneration(context);
  if (resolved) return resolved;

  let firstText = '';
  try {
    firstText = compactToProfile(
      await runSection(engine, buildSectionPrompt(context, false), false),
      context,
    );
    if (!isSectionInvalid(firstText, context)) return firstText;
  } catch {
    // Ein technischer Fehler beim ersten Versuch wird mit einem deutlich
    // kompakteren Prompt einmal innerhalb desselben echten lokalen Modells erneut versucht.
  }

  try {
    const retryText = compactToProfile(
      await runSection(engine, buildSectionPrompt(context, true), true),
      context,
    );
    if (!isSectionInvalid(retryText, context)) return retryText;
    throw makeQualityError();
  } catch (error) {
    if (error?.code === 'QUALITY_REJECTED') throw error;
    throw makeRuntimeError(error);
  }
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

      try {
        const sectionText = await generateSection(engine, {
          notes,
          area,
          formType,
          sectionMode,
          sectionLabel,
        });
        outputs.push(`${sectionLabel}\n${sectionText}`);
      } catch (error) {
        error.sectionLabel = sectionLabel;
        throw error;
      }
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
