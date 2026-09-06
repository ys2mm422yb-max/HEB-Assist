import { CreateMLCEngine, prebuiltAppConfig, hasModelInCache } from './vendor/webllm.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import { splitEvidenceUnits, evidenceCatalog } from './evidence-pipeline.js';
import {
  SECTION_KEYS,
  parseReasonedSections,
  evidenceTextsForSection,
  validateReasonedSection,
} from './reasoning-pipeline.js';

const MODEL_ID = 'Qwen3.5-0.8B-q4f16_1-MLC';
const MODEL_LABEL = 'Qwen 3.5 0.8B';
const MODEL_PROFILE = 'webllm-qwen3.5-0.8b-q4f16-heb-v15';
const MODEL_CONTEXT_WINDOW = 3072;
const MAX_NEW_TOKENS = 620;
const MISSING_TEXT = 'Hierzu liegen keine ausreichenden Angaben vor.';
const START_GUARD_KEY = 'heb-assist-ai-start-guard-v1';
const START_GUARD_MAX_AGE_MS = 30 * 60 * 1000;

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

const CORE_RULES = `Du formulierst fachliche HEB-Texte für die sozialpsychiatrische Eingliederungshilfe in Deutschland.

Arbeitsweise:
- Verstehe die gesamte Situation im Zusammenhang. Schreibe keine bloße Satz-für-Satz-Paraphrase.
- Verbinde Ressourcen, tatsächlichen Unterstützungsbedarf und tatsächlich beschriebene Unterstützung fachlich sinnvoll.
- Nutze ausschließlich Tatsachen aus den Originalaussagen. Erfinde keine Diagnose, Ursache, Motivation, Symptomatik, Fähigkeit, Entwicklung, Ziele, Maßnahmen, Hilfebedarfsstufen oder Anbieter.
- Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- Ein Impuls zum BEGINN einer Handlung bedeutet nicht Hilfe bei der DURCHFÜHRUNG.
- Vorhandene Selbstständigkeit und Ressourcen ausdrücklich erhalten.
- HEB B/C: Entwicklung nur bei einem tatsächlich beschriebenen zeitlichen Verlauf.
- Ziele nur ausgeben, wenn ein Ziel, Wunsch oder eine gewünschte Veränderung wirklich genannt ist.
- Eine formale Hilfebedarfsstufe nur ausgeben, wenn sie ausdrücklich genannt ist.
- Fehlt für einen Unterpunkt eine tragfähige Angabe, TEXT exakt: ${MISSING_TEXT}
- Keine Bewertungen, keine Meta-Kommentare, keine Markdown-Listen, keine Fantasiewörter.
- Kurz und professionell formulieren; die offiziellen HEB-Felder haben begrenzten Platz.

HEB A d): Eine konkret beschriebene laufende Unterstützung darf als dieselbe geplante Maßnahme benannt werden, wenn aus der Eingabe erkennbar ist, dass sie fortgeführt werden soll oder als aktuelles Vorgehen beschrieben ist. Keine zusätzliche oder intensivere Maßnahme ergänzen.`;

const FORMAT_INSTRUCTION = `Gib ausschließlich diese Blöcke aus, ohne Text davor oder danach:
<SECTION_A>
STATUS:supported|missing|ambiguous
EVIDENCE:S1,S2
TEXT:fachlicher Text
</SECTION_A>
Danach SECTION_B usw. bis zum letzten Unterpunkt. EVIDENCE darf nur IDs aus den Originalaussagen enthalten.`;

function createWebLlmAppConfig() {
  const selected = prebuiltAppConfig.model_list?.find((entry) => entry.model_id === MODEL_ID);
  if (!selected) {
    throw new Error(`WebLLM enthält das benötigte Modell ${MODEL_ID} nicht.`);
  }

  return {
    ...prebuiltAppConfig,
    cacheBackend: 'cache',
    model_list: [{
      ...selected,
      overrides: {
        ...(selected.overrides || {}),
        context_window_size: MODEL_CONTEXT_WINDOW,
        max_history_size: 1,
      },
    }],
  };
}

const WEBLLM_APP_CONFIG = createWebLlmAppConfig();

let generatorPromise = null;
let generatorInstance = null;
let modelInfo = null;
let modelState = { status: 'idle', percent: 0, text: 'KI wird vorbereitet …', error: null, errorCode: null };

function setModelState(next, onProgress) {
  modelState = { ...modelState, ...next };
  onProgress?.({ ...modelState });
}

function readStartGuard() {
  try {
    const raw = globalThis.localStorage?.getItem(START_GUARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function clearStartGuard() {
  try { globalThis.localStorage?.removeItem(START_GUARD_KEY); } catch { /* optional browser storage */ }
}

function hasRecentIncompleteStart() {
  const guard = readStartGuard();
  if (!guard || guard.profile !== MODEL_PROFILE) return false;
  const startedAt = Number(guard.startedAt);
  const age = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || age < 0 || age > START_GUARD_MAX_AGE_MS) {
    clearStartGuard();
    return false;
  }
  return true;
}

function markStartGuard() {
  try {
    globalThis.localStorage?.setItem(START_GUARD_KEY, JSON.stringify({
      profile: MODEL_PROFILE,
      startedAt: Date.now(),
    }));
  } catch {
    // Der Schutz ist best-effort; fehlender Website-Speicher darf den Modellstart nicht verhindern.
  }
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
  return Boolean(generatorInstance);
}

function mapLoadProgress(report, onProgress) {
  const rawProgress = Number(report?.progress);
  let percent = Number.isFinite(modelState.percent) ? modelState.percent : 3;

  if (Number.isFinite(rawProgress)) {
    if (rawProgress >= 1) {
      percent = 99;
    } else {
      percent = Math.max(percent, Math.max(3, Math.min(96, Math.floor(rawProgress * 96))));
    }
  }

  let text = 'Sprachmodell wird heruntergeladen und lokal gespeichert …';
  const rawText = String(report?.text || '').toLowerCase();

  if (/cache|cached|storage/.test(rawText)) {
    text = 'Lokaler Modell-Cache wird geprüft und vorbereitet …';
  } else if (percent >= 99) {
    text = 'Modelldateien sind geladen. KI wird initialisiert …';
  } else if (percent >= 90) {
    text = 'Sprachmodell wird fertig geladen und vorbereitet …';
  } else if (percent <= 5) {
    text = 'WebLLM-Laufzeit und Modell werden vorbereitet …';
  }

  setModelState({ status: 'loading', percent, text, error: null, errorCode: null }, onProgress);
}

function normalizeStartupError(error) {
  const raw = String(error?.message || error || 'Unbekannter technischer Fehler.');
  const lowered = raw.toLowerCase();
  let code = error?.code || 'WEBLLM_INIT_FAILED';
  let message = raw;

  if (/webgpu|gpu adapter|navigator\.gpu|gpu device/.test(lowered)) {
    code = 'WEBGPU_INIT_FAILED';
    message = `WebGPU konnte auf diesem Gerät nicht gestartet werden. Technisches Detail: ${raw}`;
  } else if (/out of memory|memory|allocation|allocate|buffer.*size|device lost/.test(lowered)) {
    code = 'MODEL_MEMORY_FAILED';
    message = `Das lokale Sprachmodell konnte wegen eines Speicher-/GPU-Fehlers nicht initialisiert werden. Technisches Detail: ${raw}`;
  } else if (/failed to fetch|network|fetch|load failed|loading.*failed/.test(lowered)) {
    code = 'MODEL_DOWNLOAD_FAILED';
    message = `Die Modelldateien konnten nicht vollständig geladen werden. Technisches Detail: ${raw}`;
  }

  const wrapped = new Error(message);
  wrapped.code = code;
  return wrapped;
}

async function loadGenerator(onProgress, { force = false } = {}) {
  if (generatorInstance) {
    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null }, onProgress);
    return generatorInstance;
  }

  if (!getLocalAiCapability().supported) {
    const error = new Error('Dieses Gerät bzw. dieser Browser stellt WebGPU aktuell nicht bereit.');
    error.code = 'WEBGPU_UNAVAILABLE';
    setModelState({ status: 'error', percent: 0, text: 'KI nicht verfügbar', error: error.message, errorCode: error.code }, onProgress);
    throw error;
  }

  if (!generatorPromise) {
    if (force) clearStartGuard();
    if (!force && hasRecentIncompleteStart()) {
      const error = new Error('Der vorherige Modellstart wurde nicht sauber abgeschlossen. Ein automatischer erneuter Großdownload wurde gestoppt. Starte die KI nur über „KI erneut starten“, wenn du bewusst einen neuen Versuch auslösen möchtest.');
      error.code = 'PREVIOUS_START_INCOMPLETE';
      setModelState({ status: 'error', percent: 0, text: 'Automatischer Neustart gestoppt', error: error.message, errorCode: error.code }, onProgress);
      throw error;
    }

    markStartGuard();
    generatorPromise = (async () => {
      setModelState({ status: 'loading', percent: 2, text: 'Lokale WebLLM-Laufzeit wird vom Gerät geladen …', error: null, errorCode: null }, onProgress);
      try { await navigator.storage?.persist?.(); } catch { /* optional */ }

      let cachedBeforeStart = false;
      try {
        cachedBeforeStart = await hasModelInCache(MODEL_ID, WEBLLM_APP_CONFIG);
      } catch {
        // Cache-Erkennung ist optional. WebLLM prüft seinen Cache beim Start selbst.
      }

      setModelState({
        status: 'loading',
        percent: 3,
        text: cachedBeforeStart
          ? 'Gespeichertes Sprachmodell wird aus dem Geräte-Cache vorbereitet …'
          : 'Qwen 3.5 0.8B wird geladen und lokal gespeichert …',
        error: null,
        errorCode: null,
      }, onProgress);

      let generator;
      try {
        generator = await CreateMLCEngine(MODEL_ID, {
          appConfig: WEBLLM_APP_CONFIG,
          initProgressCallback: (report) => mapLoadProgress(report, onProgress),
        });
      } catch (error) {
        throw normalizeStartupError(error);
      }

      generatorInstance = generator;
      modelInfo = {
        id: MODEL_ID,
        label: MODEL_LABEL,
        profile: MODEL_PROFILE,
        revision: null,
        dtype: 'q4f16_1',
        device: 'webgpu',
        runtimeLabel: 'WebLLM 0.2.84 · WebGPU · lokal gebündelt',
        persistentCache: 'WebLLM Cache API',
        contextWindow: MODEL_CONTEXT_WINDOW,
        pipeline: 'Qwen 3.5 0.8B MLC → HEB-Gesamtsynthese → lokale Sicherheitsprüfung',
      };

      clearStartGuard();
      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null }, onProgress);
      return generator;
    })().catch((error) => {
      generatorPromise = null;
      generatorInstance = null;
      clearStartGuard();
      const message = error?.message || String(error);
      setModelState({ status: 'error', percent: 0, text: 'KI nicht verfügbar', error: message, errorCode: error?.code || null }, onProgress);
      throw error;
    });
  } else {
    onProgress?.({ ...modelState });
  }

  return generatorPromise;
}

export function preloadLocalAi(onProgress, options) {
  return loadGenerator(onProgress, options);
}

function sectionInstruction(formType) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.map(([key, label, maxWords]) => `${key.toUpperCase()}: ${label} (max. ${maxWords} Wörter)`).join('\n');
}

function buildPrompt({ formType, area, catalog }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  return `${CORE_RULES}\n\nHEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\n\nOffizielle Unterpunkte:\n${sectionInstruction(formType)}\n\nOriginalaussagen:\n${catalog}\n\nAufgabe:\nErstelle einen fachlich zusammenhängenden, knappen HEB-Entwurf. Ordne die Inhalte selbst semantisch den Unterpunkten zu. Jeder nicht fehlende Unterpunkt muss in EVIDENCE ausschließlich die Original-IDs nennen, die seinen Text tatsächlich tragen.\n\n${FORMAT_INSTRUCTION}`;
}

function makeFinalText(formType, parsed) {
  const defs = SECTION_DEFS[formType] || SECTION_DEFS.A;
  return defs.map(([key, label]) => `${label}\n${parsed.sections[key]?.text || MISSING_TEXT}`).join('\n\n').trim();
}

function validateParsedOutput(parsed, units, formType) {
  const keys = SECTION_KEYS[formType] || SECTION_KEYS.A;
  const problems = [];

  for (const key of keys) {
    const section = parsed.sections[key];
    if (!section) {
      problems.push(`${key}: Abschnitt fehlt`);
      continue;
    }

    if (section.status === 'missing') {
      section.text = MISSING_TEXT;
      section.evidence = [];
      continue;
    }

    const evidence = evidenceTextsForSection(parsed, units, key);
    if (!evidence.length) {
      problems.push(`${key}: kein Originalbeleg`);
      continue;
    }

    const maxWords = SECTION_DEFS[formType]?.find(([candidate]) => candidate === key)?.[2] || 70;
    const validation = validateReasonedSection(section.text, evidence, { maxWords, allowMissing: false });
    if (!validation.ok) problems.push(`${key}: ${validation.reasons.join(', ')}`);
  }

  return { ok: problems.length === 0, problems };
}

async function runGeneration(generator, messages, onProgress) {
  let streamedText = '';
  let generatedChars = 0;
  let completionTokens = 0;
  let chunkCount = 0;

  setModelState({
    status: 'generating',
    percent: 0,
    phase: 'analysis',
    text: 'KI analysiert die Situation fachlich …',
    generatedChars: 0,
    completionTokens: 0,
    error: null,
    errorCode: null,
  }, onProgress);

  await generator.resetChat();

  const stream = await generator.chat.completions.create({
    messages,
    stream: true,
    stream_options: { include_usage: true },
    max_tokens: MAX_NEW_TOKENS,
    temperature: 0,
  });

  for await (const chunk of stream) {
    const piece = String(chunk?.choices?.[0]?.delta?.content || '');
    if (piece) {
      streamedText += piece;
      generatedChars += piece.length;
      chunkCount += 1;
    }
    if (Number.isFinite(chunk?.usage?.completion_tokens)) {
      completionTokens = chunk.usage.completion_tokens;
    }
    if (piece || completionTokens) {
      setModelState({
        status: 'generating',
        percent: 0,
        phase: 'writing',
        text: chunkCount < 3 ? 'KI ordnet die HEB-Unterpunkte zu …' : 'KI formuliert den HEB-Entwurf …',
        generatedChars,
        completionTokens,
        error: null,
        errorCode: null,
      }, onProgress);
    }
  }

  const finalMessage = String(await generator.getMessage() || '').trim();
  return finalMessage || streamedText.trim();
}

export async function generateHebText({ notes, area, formType = 'A', mode = 'complete', onProgress } = {}) {
  if (mode !== 'complete') throw new Error('HEB Assist erzeugt nur vollständige HEB-Bereiche.');
  const cleanNotes = String(notes || '').trim();
  if (!cleanNotes) throw new Error('Es wurde keine Situation angegeben.');

  const generator = await loadGenerator(onProgress);
  const units = splitEvidenceUnits(cleanNotes);
  if (!units.length) throw new Error('Die Eingabe konnte nicht in prüfbare Aussagen zerlegt werden.');

  const prompt = buildPrompt({ formType, area, catalog: evidenceCatalog(units) });
  const raw = await runGeneration(generator, [{ role: 'user', content: prompt }], onProgress);
  const parsed = parseReasonedSections(raw, units, formType, { maxEvidence: 10 });
  const validation = validateParsedOutput(parsed, units, formType);

  if (!validation.ok) {
    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null }, onProgress);
    const error = new Error(`Der erzeugte Text hat die Qualitätsprüfung nicht bestanden (${validation.problems.join(' | ')}).`);
    error.code = 'QUALITY_REJECTED';
    throw error;
  }

  setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null }, onProgress);
  return makeFinalText(formType, parsed);
}

export function getModelInfo() {
  return modelInfo ? { ...modelInfo } : {
    id: MODEL_ID,
    label: MODEL_LABEL,
    profile: MODEL_PROFILE,
    revision: null,
    dtype: 'q4f16_1',
    device: 'webgpu',
    runtimeLabel: 'WebLLM 0.2.84 · WebGPU · lokal gebündelt',
    persistentCache: 'WebLLM Cache API',
    contextWindow: MODEL_CONTEXT_WINDOW,
    pipeline: 'Qwen 3.5 0.8B MLC → HEB-Gesamtsynthese → lokale Sicherheitsprüfung',
  };
}
