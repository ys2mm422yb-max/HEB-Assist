import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import { splitEvidenceUnits, evidenceCatalog } from './evidence-pipeline.js';
import {
  SECTION_KEYS,
  stripThinkingContent,
  parseReasonedSections,
  evidenceTextsForSection,
  validateReasonedSection,
} from './reasoning-pipeline.js';

const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.82';
const MODEL_KEY = 'Qwen3-0.6B-q4f16_1-MLC';
const MODEL_LABEL = 'Qwen 3 0.6B';
const MODEL_PROFILE = 'webllm-qwen3-0.6b-thinking-heb-v9-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const LEGACY_MODEL_KEY = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';
const UNSAFE_TEXT = 'Die vorhandenen Angaben konnten für diesen Unterpunkt nicht sicher formuliert werden.';

// Architektur v9
// ---------------
// Kein regelbasiertes Quellenrouting mehr. Die lokale KI liest die komplette
// Eingabe im Zusammenhang und nutzt den Qwen3-Thinking-Modus für eine echte
// semantische Fallanalyse. Danach prüft dieselbe lokale KI den ersten Entwurf
// nochmals gegen die Originalaussagen. Lokale Regeln schreiben keinen HEB-Text;
// sie prüfen nur Struktur, Quellen-IDs und klar erkennbare Sicherheitsfehler.

const SECTION_DEFS = {
  A: [
    ['a', 'a) Aktuelle Situation bzw. Problemlage unter Berücksichtigung der Ressourcen', 100],
    ['b', 'b) Einschätzung des Hilfebedarfs', 65],
    ['c', 'c) Rahmenziele für den Planungszeitraum', 52],
    ['d', 'd) Beschreibung der geplanten Maßnahmen', 82],
  ],
  B: [
    ['a', 'a) Reflexion der durchgeführten Maßnahmen', 80],
    ['b', 'b) Beschreibung der Entwicklung innerhalb des letzten Planungszeitraumes anhand der Rahmenziele unter Berücksichtigung der Ressourcen', 100],
    ['c', 'c) Einschätzung des Hilfebedarfs', 65],
    ['d', 'd) Fortschreibung der Rahmenziele', 52],
    ['e', 'e) Beschreibung der geplanten Maßnahmen', 82],
  ],
  C: [
    ['a', 'a) Reflexion der durchgeführten Maßnahmen im letzten Förderzeitraum', 80],
    ['b', 'b) Beschreibung der Entwicklung anhand der Rahmenziele unter Berücksichtigung der Ressourcen', 96],
    ['c', 'c) Einschätzung des noch bestehenden Hilfebedarfs', 65],
    ['d', 'd) Welche weiteren Maßnahmen sind vorgesehen', 78],
    ['e', 'e) Durch wen werden diese Maßnahmen erbracht', 48],
  ],
};

const FORMAT_INSTRUCTION = `Nutze für jeden Unterpunkt exakt dieses Format:
<SECTION_A>
STATUS:supported|missing|context_only|ambiguous
EVIDENCE:S1,S2
TEXT:fachlicher Text
</SECTION_A>

Danach SECTION_B usw. bis zum letzten Unterpunkt. Keine anderen sichtbaren Ausgaben außerhalb dieser Blöcke.`;

const REASONING_SYSTEM = `Du bist ein fachlich arbeitender HEB-Assistent für die sozialpsychiatrische Eingliederungshilfe.
Analysiere die gesamte Eingabe im Zusammenhang und denke zuerst fachlich darüber nach, was tatsächlich beschrieben ist, welche Ressourcen sichtbar sind, welcher Unterstützungsbedarf daraus hervorgeht und was ausdrücklich fehlt.
Du darfst fachliche Bedeutungen aus ausdrücklich beschriebenen Tatsachen erkennen. Beispiel: Wenn eine Person einen verbalen Impuls braucht, um eine Tätigkeit zu beginnen, besteht Unterstützungsbedarf bei der Initiierung; wenn sie danach selbstständig handelt, bleibt genau diese Selbstständigkeit als Ressource erhalten.
Du darfst niemals Diagnosen, Symptome, Ursachen, Motive, Fähigkeiten, Risiken, Entwicklungen, Ziele, Maßnahmen, Hilfebedarfsstufen oder Anbieter erfinden.
Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
Ein aktuell beschriebenes Unterstützungsverhalten ist nicht automatisch eine zukünftige Planung.
Fehlt ein Ziel oder eine Zukunftsplanung, kennzeichne das transparent statt etwas zu erfinden.
Bei HEB B/C darf ohne echten zeitlichen Vergleich keine Entwicklung behauptet werden.
Formuliere natürliches, professionelles, neutrales, ressourcenorientiertes Deutsch. Kopiere die Eingabe nicht bloß Satz für Satz, sondern fasse fachlich zusammen.
Die sichtbare Endantwort muss ausschließlich im vorgegebenen SECTION-Format erfolgen.`;

const REVIEW_SYSTEM = `Du bist die fachliche Qualitätsprüfung eines HEB-Entwurfs.
Lies die Originalaussagen und den ersten Entwurf vollständig. Prüfe jeden Unterpunkt auf Tatsachentreue, fachliche Zuordnung, Widersprüche, Bedeutungsverschiebungen und Sprache.
Korrigiere jeden problematischen Abschnitt direkt. Besonders streng prüfen:
- vorhandener Unterstützungsbedarf darf niemals verneint werden,
- Unterstützung beim Beginn darf nicht zu Unterstützung bei der Durchführung werden,
- vorhandene Selbstständigkeit darf nicht abgeschwächt werden,
- Ziele, Entwicklungen, Anbieter und formale Hilfebedarfsstufen dürfen nicht erfunden werden,
- aktuelle Unterstützungen dürfen nicht als zukünftige Maßnahmen ausgegeben werden, wenn ihre Fortführung nicht ausdrücklich angegeben ist.
Wenn Informationen für einen Unterpunkt fehlen, TEXT exakt: Hierzu liegen keine ausreichenden Angaben vor.
Wenn aktuelle Maßnahmen beschrieben sind, aber keine ausdrückliche Zukunftsplanung vorliegt, nutze STATUS:context_only und benenne die aktuell beschriebenen Unterstützungen fachlich; sage zugleich knapp, dass die Fortführung im Planungszeitraum nicht ausdrücklich angegeben ist.
Die sichtbare Endantwort muss ausschließlich im vorgegebenen SECTION-Format erfolgen.`;

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

  const config = { ...webllm.prebuiltAppConfig, model_list: modelList };
  if (!config.model_list.some((entry) => entry.model_id === MODEL_KEY)) {
    throw new Error(`Das lokale Modell ${MODEL_KEY} wird von WebLLM 0.2.82 nicht unterstützt.`);
  }

  try { await navigator.storage?.persist?.(); } catch { /* optionale Browser-Optimierung */ }
  webllmModule = webllm;
  appConfig = config;
  return { webllm, appConfig: config };
}

async function cleanupLegacyModelCache(webllm, config) {
  try {
    const key = 'heb-assist-model-cache-v9-cleaned';
    if (globalThis.localStorage?.getItem(key) === '1') return;
    await webllm.deleteModelAllInfoInCache?.(LEGACY_MODEL_KEY, config);
    globalThis.localStorage?.setItem(key, '1');
  } catch {
    // Technische Cache-Bereinigung ist optional und darf die einsatzbereite KI
    // nicht wieder blockieren.
  }
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
          : 'Neues Sprachmodell wird beim ersten Start heruntergeladen und lokal zwischengespeichert …',
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
        persistentCache: 'Browser-Cache',
        contextLength: CONTEXT_WINDOW_SIZE,
        pipeline: 'Qwen3 Thinking-Fallanalyse → lokale KI-Gegenprüfung',
      };
      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
      cleanupLegacyModelCache(webllm, config);
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
  return stripThinkingContent(
    String(text || '')
      .replace(/<\|im_start\|>|<\|im_end\|>|<bos>|<eos>/gi, '')
      .replace(/^assistant\s*:?\s*/i, '')
  );
}

async function runCompletion(engine, system, prompt, { thinking = false, maxTokens = 650, seed = 17 } = {}) {
  const response = await engine.chat.completions.create({
    stream: false,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    temperature: thinking ? 0.6 : 0.7,
    top_p: thinking ? 0.95 : 0.8,
    repetition_penalty: 1.03,
    presence_penalty: 0.15,
    max_tokens: maxTokens,
    seed,
    extra_body: { enable_thinking: thinking },
  });
  return normalizeOutput(response?.choices?.[0]?.message?.content || '');
}

function sectionInstruction(formType) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.map(([key, label]) => `${key.toUpperCase()}: ${label}`).join('\n');
}

function buildReasoningPrompt({ formType, area, catalog }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\n\nOffizielle Unterpunkte:\n${sectionInstruction(formType)}\n\nOriginalaussagen:\n${catalog}\n\nAufgabe:\nAnalysiere die gesamte Situation semantisch und erstelle anschließend für jeden Unterpunkt einen fachlichen Text. Nutze EVIDENCE nur mit den IDs der Originalaussagen, die den jeweiligen Text tragen.\n\nStatusregeln:\n- supported: Unterpunkt ist aus den Originalaussagen fachlich belegbar.\n- missing: Es fehlt eine ausreichende Angabe; TEXT exakt "${MISSING_TEXT}".\n- context_only: Es gibt aktuelle passende Angaben, aber die vom Unterpunkt verlangte Zukunft/Planung ist nicht ausdrücklich genannt.\n- ambiguous: Quellen sind widersprüchlich oder nicht eindeutig genug.\n\nFür HEB A besonders wichtig:\n- a beschreibt aktuelle Situation plus Ressourcen.\n- b beschreibt den tatsächlich erkennbaren Unterstützungsbedarf, ohne formale Hilfebedarfsstufe.\n- c enthält nur ausdrücklich genannte Ziele/Wünsche.\n- d enthält ausdrücklich geplante Maßnahmen; wenn nur aktuelle Unterstützungen beschrieben sind, nutze context_only und benenne diese aktuell beschriebenen Unterstützungen ohne ihre Fortführung zu behaupten.\n\n${FORMAT_INSTRUCTION}`;
}

function serializeSections(parsed, formType) {
  const keys = SECTION_KEYS[formType] || SECTION_KEYS.A;
  return keys.map((key) => {
    const section = parsed.sections[key];
    return `<SECTION_${key.toUpperCase()}>\nSTATUS:${section.status}\nEVIDENCE:${section.evidence.join(',')}\nTEXT:${section.text}\n</SECTION_${key.toUpperCase()}>`;
  }).join('\n\n');
}

function buildReviewPrompt({ formType, area, catalog, firstDraft }) {
  return `HEB-Bereich: ${area}\n\nOriginalaussagen:\n${catalog}\n\nErster KI-Entwurf:\n${serializeSections(firstDraft, formType)}\n\nPrüfe jetzt jeden Unterpunkt gegen die gesamte Eingabe. Verbessere Sprache und fachliche Synthese, wenn nötig. Korrigiere jede falsche Negation, jede Bedeutungsverschiebung oder erfundene Aussage. EVIDENCE muss die tatsächlich verwendeten Quellen-IDs enthalten.\n\n${FORMAT_INSTRUCTION}`;
}

function sectionMaxWords(formType, key) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.find(([candidate]) => candidate === key)?.[2] || 80;
}

function makeFinalText(formType, parsed) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.map(([key, label]) => `${label}\n${parsed.sections[key]?.text || MISSING_TEXT}`).join('\n\n').trim();
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  void mode;
  const engine = await loadEngine(onProgress);
  const units = splitEvidenceUnits(notes);
  if (!units.length) {
    const error = new Error('Die Eingabe enthält keine verwertbaren Angaben.');
    error.code = 'QUALITY_REJECTED';
    throw error;
  }

  const keys = SECTION_KEYS[formType] || SECTION_KEYS.A;
  const catalog = evidenceCatalog(units);

  try {
    setModelState({ status: 'generating', percent: 100, text: 'KI analysiert die Situation fachlich …', error: null }, onProgress);
    const firstText = await runCompletion(
      engine,
      REASONING_SYSTEM,
      buildReasoningPrompt({ formType, area, catalog }),
      { thinking: true, maxTokens: 760, seed: 31 },
    );
    let firstDraft = parseReasonedSections(firstText, units, formType);
    let firstHasStructure = keys.some((key) => firstDraft.sections[key]?.text);

    // Falls der Thinking-Anteil das knappe mobile Tokenbudget vollständig
    // verbraucht, gibt es genau einen zweiten echten LLM-Lauf ohne Thinking.
    // Es wird weiterhin keinerlei regelbasierter HEB-Text erzeugt.
    if (!firstHasStructure) {
      setModelState({ status: 'generating', percent: 100, text: 'KI verdichtet die fachliche Analyse …', error: null }, onProgress);
      const compactText = await runCompletion(
        engine,
        REASONING_SYSTEM,
        buildReasoningPrompt({ formType, area, catalog }),
        { thinking: false, maxTokens: 680, seed: 33 },
      );
      firstDraft = parseReasonedSections(compactText, units, formType);
      firstHasStructure = keys.some((key) => firstDraft.sections[key]?.text);
    }
    if (!firstHasStructure) throw new Error('Die lokale KI konnte keinen strukturierten HEB-Entwurf erzeugen.');

    setModelState({ status: 'generating', percent: 100, text: 'KI prüft Inhalt und Fachlichkeit …', error: null }, onProgress);
    const reviewedText = await runCompletion(
      engine,
      REVIEW_SYSTEM,
      buildReviewPrompt({ formType, area, catalog, firstDraft }),
      { thinking: false, maxTokens: 680, seed: 37 },
    );
    const reviewedCandidate = parseReasonedSections(reviewedText, units, formType);
    const reviewedHasStructure = keys.some((key) => reviewedCandidate.sections[key]?.text);
    const reviewed = reviewedHasStructure ? reviewedCandidate : firstDraft;

    let usefulSections = 0;
    for (const key of keys) {
      const section = reviewed.sections[key];
      const evidenceTexts = evidenceTextsForSection(reviewed, units, key);
      const isMissing = section.status === 'missing' || section.text === MISSING_TEXT;

      if (isMissing) {
        section.status = 'missing';
        section.text = MISSING_TEXT;
        continue;
      }

      if (!section.evidence.length) {
        section.status = 'ambiguous';
        section.text = UNSAFE_TEXT;
        continue;
      }

      const check = validateReasonedSection(section.text, evidenceTexts, {
        maxWords: sectionMaxWords(formType, key),
        allowMissing: false,
      });

      if (!check.ok) {
        section.status = 'ambiguous';
        section.text = UNSAFE_TEXT;
        continue;
      }

      usefulSections += 1;
    }

    if (!usefulSections) {
      const error = new Error('Der erzeugte Text hat die Qualitätsprüfung nicht bestanden und wurde verworfen.');
      error.code = 'QUALITY_REJECTED';
      throw error;
    }

    const finalText = makeFinalText(formType, reviewed);
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
