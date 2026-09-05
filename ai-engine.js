import { HEB_FORM_CONFIG, getOutputInstruction } from './heb-knowledge.js';

const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm';
const MODEL_KEY = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
const MODEL_LABEL = 'Qwen 2.5 0.5B Instruct';
const MODEL_PROFILE = 'webllm-qwen25-05b-cached';

const CORE_RULES = `Du bist HEB Assist. Du formulierst ausschließlich professionelle HEB-Texte für die sozialpsychiatrische Eingliederungshilfe.

Verbindliche Regeln:
- Nutze ausschließlich Tatsachen aus der Fallbeschreibung. Nichts erfinden, vermuten oder fachlich dazudichten.
- Alltagsformulierungen der Eingabe sind verwertbare Angaben. Eine Information muss nicht ausdrücklich als „Ressource“, „Hilfebedarf“, „Ziel“ oder „Maßnahme“ bezeichnet sein.
- Keine Diagnose, Ursache, Symptome, Risiken oder sonstige nicht genannte Tatsachen ergänzen.
- Schreibe in klarem, korrektem, professionellem Deutsch.
- Sachlich, wertschätzend, ressourcenorientiert und personenzentriert formulieren.
- Verwende „die Person“ oder „die leistungsberechtigte Person“, keine Namen.
- Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt wurde.
- Keine Überschriften, Listen, HEB-Kürzel oder Meta-Kommentare in der eigentlichen Antwort.
- Antworte nur mit dem fertigen Fließtext für genau den angeforderten Unterpunkt.
- „Hierzu liegen keine ausreichenden Angaben vor.“ darf nur verwendet werden, wenn die Fallbeschreibung tatsächlich keinerlei verwertbare Information für diesen Unterpunkt enthält.`;

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

const SECTION_GUIDANCE = {
  current: `Nutze alle beschriebenen Angaben zu Verhalten, Selbstständigkeit, Schwierigkeiten, Ressourcen und bereits benötigter Unterstützung. Stelle erkennbar gegenüber, was der Person selbstständig gelingt und wobei die eigenständige Durchführung nicht durchgehend gelingt. Wenn eine konkrete Alltagssituation beschrieben ist, sind dafür ausreichende Angaben vorhanden.`,
  support: `Leite den Unterstützungsbedarf ausschließlich aus konkret beschriebenen Situationen ab. Formulierungen wie „benötigt eine Erinnerung“, „benötigt Unterstützung“, „wird gemeinsam geplant“ oder vergleichbare Angaben sind direkte Hinweise auf Hilfebedarf. Benenne zugleich ausdrücklich vorhandene Selbstständigkeit. Keine formale Hilfebedarfsstufe auswählen.`,
  goals: `Formuliere ein vorsichtiges Rahmenziel unmittelbar aus der beschriebenen Situation. Zulässig sind nur Erhalt, Stabilisierung oder Weiterentwicklung bereits beschriebener Selbstständigkeit bzw. die Förderung größerer Eigenständigkeit genau in dem beschriebenen Unterstützungsbereich. Keine neuen Lebensbereiche, Zeitangaben oder Erfolgsversprechen erfinden. Ein so direkt aus der Situation formulierter Zielzustand ist eine fachliche Zielformulierung und keine zusätzliche Tatsachenbehauptung.`,
  measures: `Formuliere ausschließlich die bereits beschriebenen Unterstützungsformen als geplante Maßnahmen. Eine genannte verbale Erinnerung darf als bedarfsorientierter verbaler Impuls formuliert werden; eine gemeinsame Planung darf als gemeinsame Planung formuliert werden; genannte Unterstützung darf inhaltlich konkret, aber nicht um neue Methoden, Häufigkeiten oder Personen erweitert werden.`,
  reflection: `Reflektiere nur tatsächlich genannte durchgeführte Maßnahmen und deren beschriebenen Verlauf oder Wirkung. Wenn keine durchgeführte Maßnahme oder kein Verlauf genannt ist, fehlen Angaben.`,
  development: `Beschreibe nur eine ausdrücklich erkennbare Entwicklung, Veränderung, Stabilität oder Verschlechterung im Zeitraum. Wenn die Eingabe keinen zeitlichen Vergleich enthält, fehlen Angaben.`,
  remainingSupport: `Nutze nur den ausdrücklich noch bestehenden Unterstützungsbedarf. Keine formale Hilfebedarfsstufe ergänzen.`,
  furtherMeasures: `Formuliere nur ausdrücklich vorgesehene weitere Maßnahmen. Nichts ergänzen.`,
  provider: `Nenne nur den ausdrücklich genannten Erbringer weiterer Maßnahmen. Fehlt dieser, sage knapp, dass hierzu keine Angabe vorliegt.`,
};

const SECTION_EXAMPLES = {
  current: `Beispiel für den Stil: „Die Person benötigt zur Aufnahme der Körperpflege häufig einen verbalen Impuls. Nach erfolgter Erinnerung führt sie die Körperpflege überwiegend selbstständig durch. Bei Einkäufen wählt sie benötigte Produkte selbstständig aus.“`,
  support: `Beispiel für den Stil: „Zur Initiierung der Körperpflege sind bedarfsorientierte verbale Impulse erforderlich. Bei der Einkaufsplanung und beim Überblick über verfügbare finanzielle Mittel besteht Unterstützungsbedarf; die Produktauswahl gelingt selbstständig.“`,
  goals: `Beispiel für den Stil: „Die vorhandene Selbstständigkeit bei der Körperpflege und der Produktauswahl soll erhalten und weiter gestärkt werden. Im Umgang mit den verfügbaren finanziellen Mitteln soll die eigenständige Übersicht gefördert werden.“`,
  measures: `Beispiel für den Stil: „Bei Bedarf werden verbale Impulse zur Aufnahme der Körperpflege gegeben. Einkäufe werden gemeinsam geplant; beim Überblick über die verfügbaren finanziellen Mittel erfolgt Unterstützung.“`,
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
  const guidance = SECTION_GUIDANCE[sectionMode] || '';
  const example = SECTION_EXAMPLES[sectionMode] || '';

  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nUnterpunkt: ${sectionLabel}\n\nFachliche Aufgabe:\n${instruction}\n\nWichtige Auslegung für diesen Unterpunkt:\n${guidance}\n${example ? `\n${example}\n` : ''}\nFallbeschreibung:\n${notes}\n\nFormuliere jetzt ausschließlich den Inhalt dieses Unterpunkts. Nutze die tatsächlich vorhandenen Angaben. Schreibe 1 bis 3 vollständige Sätze mit höchstens 90 Wörtern. Keine Vorbemerkung, keine Überschrift und keine Liste.`;
}

function normalizeOutput(text) {
  return String(text || '')
    .replace(/<\|im_start\|>|<\|im_end\|>|<bos>|<eos>/gi, '')
    .replace(/^assistant\s*:?\s*/i, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isMissingOutput(text) {
  const cleaned = normalizeOutput(text).replace(/[.!]+$/g, '').trim().toLowerCase();
  return cleaned === 'hierzu liegen keine ausreichenden angaben vor' ||
    cleaned === 'hierzu liegt keine ausreichende angabe vor' ||
    cleaned === 'hierzu liegt keine angabe vor';
}

function hasSupportEvidence(notes) {
  return /\b(benötig\w*|unterstütz\w*|erinner\w*|impuls\w*|gemeinsam|begleit\w*|anleit\w*|hilfe\w*|hilfestell\w*|struktur\w*)\b/i.test(notes);
}

function shouldContainContent({ notes, formType, sectionMode }) {
  const value = String(notes || '').trim();
  if (!value) return false;

  if (formType === 'A') {
    if (sectionMode === 'current') return true;
    if (sectionMode === 'support') return hasSupportEvidence(value);
    if (sectionMode === 'goals') return value.length >= 40;
    if (sectionMode === 'measures') return hasSupportEvidence(value);
  }

  if (sectionMode === 'remainingSupport') return hasSupportEvidence(value);
  return false;
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
          ? `${prompt}\n\nDie erste Antwort war unbrauchbar. Lies die Fallbeschreibung noch einmal genau. Verwende vorhandene Alltagsschilderungen als fachlich verwertbare Angaben. Antworte nicht mit „keine ausreichenden Angaben“, wenn im Text konkrete Selbstständigkeit, Schwierigkeiten oder Unterstützung beschrieben sind. Prüfe außerdem korrektes Deutsch und erfinde nichts.`
          : prompt,
      },
    ],
    temperature: strictRetry ? 0.05 : 0.08,
    top_p: 0.9,
    repetition_penalty: strictRetry ? 1.18 : 1.1,
    max_tokens: strictRetry ? 120 : 120,
  });

  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

async function generateSection(engine, prompt, context) {
  let text = await runSection(engine, prompt, false);
  let invalid = isDegenerateOutput(text) || (shouldContainContent(context) && isMissingOutput(text));
  if (!invalid) return text;

  text = await runSection(engine, prompt, true);
  invalid = isDegenerateOutput(text) || (shouldContainContent(context) && isMissingOutput(text));
  if (invalid) {
    throw new Error('Die lokale KI hat für mindestens einen HEB-Unterpunkt keinen fachlich verwertbaren Text erzeugt. Der Entwurf wurde verworfen, statt eine offensichtlich falsche Leer-Antwort anzuzeigen.');
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
    const sectionText = await generateSection(engine, prompt, { notes, formType, sectionMode });
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
