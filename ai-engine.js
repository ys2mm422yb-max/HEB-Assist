import * as webllm from './vendor/webllm.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import { splitEvidenceUnits, evidenceCatalog } from './evidence-pipeline.js';
import {
  SECTION_KEYS,
  stripThinkingContent,
  parseReasonedSections,
  evidenceTextsForSection,
  validateReasonedSection,
} from './reasoning-pipeline.js';

const MODEL_KEY = 'Qwen3-1.7B-q4f16_1-MLC';
const MODEL_LABEL = 'Qwen 3 1.7B';
const MODEL_PROFILE = 'webllm-qwen3-1.7b-thinking-heb-v10-ctx2048';
const CONTEXT_WINDOW_SIZE = 2048;
const PREFILL_CHUNK_SIZE = 128;
const GENERATION_TIMEOUT_MS = 180_000;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';

const LEGACY_MODEL_KEYS = [
  'Qwen3-0.6B-q4f16_1-MLC',
  'Llama-3.2-1B-Instruct-q4f16_1-MLC',
];

// v10: Ein stärkeres lokales Modell übernimmt die komplette fachliche Synthese
// in genau einem Modelllauf. Regeln erzeugen keinen HEB-Text und es gibt keinen
// zweiten KI-Reviewer. Die lokale Nachprüfung blockiert nur klar unzulässige
// Ausgaben (z. B. erfundene Ursachen, Bedeutungsverschiebungen, Degeneration).

const SECTION_DEFS = {
  A: [
    ['a', 'a) Aktuelle Situation bzw. Problemlage unter Berücksichtigung der Ressourcen', 75],
    ['b', 'b) Einschätzung des Hilfebedarfs', 45],
    ['c', 'c) Rahmenziele für den Planungszeitraum', 45],
    ['d', 'd) Beschreibung der geplanten Maßnahmen', 60],
  ],
  B: [
    ['a', 'a) Reflexion der durchgeführten Maßnahmen', 60],
    ['b', 'b) Beschreibung der Entwicklung innerhalb des letzten Planungszeitraumes anhand der Rahmenziele unter Berücksichtigung der Ressourcen', 80],
    ['c', 'c) Einschätzung des Hilfebedarfs', 45],
    ['d', 'd) Fortschreibung der Rahmenziele', 45],
    ['e', 'e) Beschreibung der geplanten Maßnahmen', 60],
  ],
  C: [
    ['a', 'a) Reflexion der durchgeführten Maßnahmen im letzten Förderzeitraum', 60],
    ['b', 'b) Beschreibung der Entwicklung anhand der Rahmenziele unter Berücksichtigung der Ressourcen', 75],
    ['c', 'c) Einschätzung des noch bestehenden Hilfebedarfs', 45],
    ['d', 'd) Welche weiteren Maßnahmen sind vorgesehen', 55],
    ['e', 'e) Durch wen werden diese Maßnahmen erbracht', 38],
  ],
};

const SYSTEM_PROMPT = `Du formulierst HEB-Texte für die sozialpsychiatrische Eingliederungshilfe in Deutschland.
Arbeite fachlich, neutral, knapp, ressourcenorientiert und gut verständlich. Lies die gesamte Situation im Zusammenhang und bilde daraus eine echte fachliche Synthese statt die Eingabe Satz für Satz umzuschreiben.

Verbindliche Regeln:
- Nur Tatsachen verwenden, die in den Originalaussagen stehen oder unmittelbar daraus fachlich folgen.
- Keine Diagnose, Ursache, Motivation, Symptomatik, Fähigkeit, Entwicklung, Ziel, Maßnahme, Hilfebedarfsstufe oder Anbieter erfinden.
- Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- Unterstützungsbedarf präzise auf den beschriebenen Teil einer Handlung begrenzen. Ein Impuls zum Beginn bedeutet nicht automatisch Hilfe bei der Durchführung.
- Gleichzeitig erkennbare Ressourcen ausdrücklich erhalten.
- HEB B/C: ohne zeitlichen Vergleich keine Entwicklung behaupten.
- Fehlt eine Angabe für einen Unterpunkt, TEXT exakt: ${MISSING_TEXT}
- Keine Bewertungen wie „gute Idee“, keine Meta-Kommentare, keine Markdown-Listen und keine Fantasiewörter.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt ist.

HEB A: Wenn eine konkrete laufende Unterstützungshandlung beschrieben ist, darf sie unter d) fachlich als Maßnahme benannt werden, aber ausschließlich in derselben beschriebenen Form. Keine zusätzliche oder intensivere Maßnahme ergänzen.

Denke intern über Zusammenhänge nach. Die sichtbare Antwort darf ausschließlich aus den verlangten SECTION-Blöcken bestehen.`;

const FORMAT_INSTRUCTION = `Für jeden Unterpunkt exakt:
<SECTION_A>
STATUS:supported|missing|ambiguous
EVIDENCE:S1,S2
TEXT:fachlicher Text
</SECTION_A>
Danach SECTION_B usw. Keine Ausgabe außerhalb der SECTION-Blöcke.`;

let enginePromise = null;
let engineInstance = null;
let modelInfo = null;
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
    runtime: 'webllm-local-bundle',
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

function buildAppConfig() {
  if (appConfig) return appConfig;
  const modelList = webllm.prebuiltAppConfig.model_list.map((entry) => {
    if (entry.model_id !== MODEL_KEY) return entry;
    return {
      ...entry,
      overrides: {
        ...(entry.overrides || {}),
        context_window_size: CONTEXT_WINDOW_SIZE,
        prefill_chunk_size: PREFILL_CHUNK_SIZE,
      },
    };
  });

  if (!modelList.some((entry) => entry.model_id === MODEL_KEY)) {
    throw new Error(`Das lokale Modell ${MODEL_KEY} wird von der eingebauten WebLLM-Laufzeit nicht unterstützt.`);
  }

  appConfig = { ...webllm.prebuiltAppConfig, model_list: modelList };
  return appConfig;
}

async function cleanupLegacyModelCaches(config) {
  try {
    const key = 'heb-assist-model-cache-v10-cleaned';
    if (globalThis.localStorage?.getItem(key) === '1') return;
    for (const legacyKey of LEGACY_MODEL_KEYS) {
      try { await webllm.deleteModelAllInfoInCache?.(legacyKey, config); } catch { /* optional */ }
    }
    globalThis.localStorage?.setItem(key, '1');
  } catch {
    // Die Bereinigung alter Testmodelle darf die aktuelle KI nie blockieren.
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
      setModelState({ status: 'loading', percent: 2, text: 'Lokale KI-Laufzeit wird vom Gerät geladen …', error: null }, onProgress);
      const config = buildAppConfig();
      try { await navigator.storage?.persist?.(); } catch { /* optional */ }

      let cached = false;
      try { cached = await webllm.hasModelInCache(MODEL_KEY, config); } catch { cached = false; }

      setModelState({
        status: 'loading',
        percent: 4,
        text: cached
          ? 'Gespeichertes Sprachmodell wird auf dem Gerät gestartet …'
          : 'Qwen 3 1.7B wird einmalig heruntergeladen und lokal gespeichert …',
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
        runtimeLabel: 'WebLLM 0.2.82 · lokal gebündelt',
        persistentCache: 'Browser-Cache',
        contextLength: CONTEXT_WINDOW_SIZE,
        prefillChunkSize: PREFILL_CHUNK_SIZE,
        pipeline: 'Qwen3 1.7B Thinking-Gesamtsynthese → lokale Sicherheitsprüfung',
      };

      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
      void cleanupLegacyModelCaches(config);
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

function sectionInstruction(formType) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.map(([key, label, maxWords]) => `${key.toUpperCase()}: ${label} (max. ${maxWords} Wörter)`).join('\n');
}

function buildPrompt({ formType, area, catalog }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  return `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\n\nUnterpunkte:\n${sectionInstruction(formType)}\n\nOriginalaussagen:\n${catalog}\n\nAufgabe:\nErstelle aus der gesamten Situation einen kurzen, professionellen HEB-Entwurf. Verknüpfe zusammengehörige Angaben fachlich, ohne neue Tatsachen zu erfinden. Nutze bei jedem nicht fehlenden Unterpunkt EVIDENCE nur mit den Original-IDs, die den Text tatsächlich tragen.\n\nBesonders wichtig:\n- Ressourcen und Unterstützungsbedarf zusammenhängend darstellen.\n- Ein verbaler Impuls zum Beginn ist Hilfebedarf bei der Initiierung, nicht bei der anschließenden Durchführung.\n- Ziele nur bei ausdrücklich genanntem Ziel/Wunsch.\n- HEB B/C: Entwicklung nur bei echtem zeitlichem Verlauf.\n- HEB A d): konkret beschriebene laufende Unterstützung darf als dieselbe Maßnahme benannt werden; nichts ergänzen.\n\n${FORMAT_INSTRUCTION}`;
}

function sectionMaxWords(formType, key) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.find(([candidate]) => candidate === key)?.[2] || 70;
}

function makeFinalText(formType, parsed) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.map(([key, label]) => `${label}\n${parsed.sections[key]?.text || MISSING_TEXT}`).join('\n\n').trim();
}

async function runSingleCompletion(engine, prompt, onProgress) {
  let raw = '';
  let visibleChars = 0;
  let completionTokens = 0;
  let timedOut = false;
  const startedAt = Date.now();

  setModelState({
    status: 'generating',
    percent: 0,
    phase: 'analysis',
    text: 'KI analysiert die Situation fachlich …',
    generatedChars: 0,
    completionTokens: 0,
    error: null,
  }, onProgress);

  const timeout = window.setTimeout(() => {
    timedOut = true;
    try { engine.interruptGenerate?.(); } catch { /* best effort */ }
  }, GENERATION_TIMEOUT_MS);

  try {
    const stream = await engine.chat.completions.create({
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.55,
      top_p: 0.9,
      repetition_penalty: 1.05,
      max_tokens: 800,
      seed: 41,
      extra_body: { enable_thinking: true },
    });

    for await (const chunk of stream) {
      if (timedOut) break;
      const delta = chunk?.choices?.[0]?.delta || {};
      const piece = String(delta.content || '');
      if (piece) {
        raw += piece;
        visibleChars += piece.length;
      }
      if (Number.isFinite(chunk?.usage?.completion_tokens)) {
        completionTokens = chunk.usage.completion_tokens;
      }

      const thinkClosed = raw.includes('</think>');
      const phase = thinkClosed ? 'writing' : 'analysis';
      const text = thinkClosed
        ? 'KI formuliert den HEB-Entwurf …'
        : 'KI analysiert die Situation fachlich …';

      setModelState({
        status: 'generating',
        percent: 0,
        phase,
        text,
        generatedChars: visibleChars,
        completionTokens,
        elapsedMs: Date.now() - startedAt,
        error: null,
      }, onProgress);
    }
  } finally {
    window.clearTimeout(timeout);
  }

  if (timedOut) {
    const error = new Error('Die lokale KI hat die maximale Bearbeitungszeit von drei Minuten überschritten.');
    error.code = 'GENERATION_TIMEOUT';
    throw error;
  }

  return normalizeOutput(raw);
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
    const rawText = await runSingleCompletion(
      engine,
      buildPrompt({ formType, area, catalog }),
      onProgress,
    );

    const parsed = parseReasonedSections(rawText, units, formType);
    const hasStructure = keys.every((key) => Boolean(parsed.sections[key]?.text));
    if (!hasStructure) {
      const error = new Error('Die lokale KI hat keinen vollständig strukturierten HEB-Entwurf erzeugt.');
      error.code = 'QUALITY_REJECTED';
      throw error;
    }

    let usefulSections = 0;
    for (const key of keys) {
      const section = parsed.sections[key];
      const isMissing = section.status === 'missing' || section.text === MISSING_TEXT;

      if (isMissing) {
        section.status = 'missing';
        section.text = MISSING_TEXT;
        section.evidence = [];
        continue;
      }

      if (!section.evidence.length) {
        const error = new Error(`Unterpunkt ${key}) enthält keinen nachvollziehbaren Quellenbeleg.`);
        error.code = 'QUALITY_REJECTED';
        throw error;
      }

      const evidenceTexts = evidenceTextsForSection(parsed, units, key);
      const check = validateReasonedSection(section.text, evidenceTexts, {
        maxWords: sectionMaxWords(formType, key),
        allowMissing: false,
      });

      if (!check.ok) {
        const error = new Error(`Unterpunkt ${key}) hat die lokale Sicherheitsprüfung nicht bestanden: ${check.reasons.join(', ')}`);
        error.code = 'QUALITY_REJECTED';
        throw error;
      }

      usefulSections += 1;
    }

    if (!usefulSections) {
      const error = new Error('Der erzeugte Text enthält keinen sicher nutzbaren HEB-Unterpunkt.');
      error.code = 'QUALITY_REJECTED';
      throw error;
    }

    const finalText = makeFinalText(formType, parsed);
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
