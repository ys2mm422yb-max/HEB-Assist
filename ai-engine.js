import { pipeline, env, TextStreamer } from './vendor/transformers.js';
import { HEB_FORM_CONFIG } from './heb-knowledge.js';
import { splitEvidenceUnits, evidenceCatalog } from './evidence-pipeline.js';
import {
  SECTION_KEYS,
  parseReasonedSections,
  evidenceTextsForSection,
  validateReasonedSection,
} from './reasoning-pipeline.js';

const MODEL_ID = 'onnx-community/Qwen3.5-0.8B-ONNX';
const MODEL_REVISION = '7126260ed8e5acbe7b5d0b84bbec84df50b63a87';
const MODEL_LABEL = 'Qwen 3.5 0.8B';
const MODEL_PROFILE = 'transformersjs-qwen3.5-0.8b-text-q4f16-heb-v12';
const MODEL_DTYPE = 'q4f16';
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

let generatorPromise = null;
let generatorInstance = null;
let modelInfo = null;
let modelState = { status: 'idle', percent: 0, text: 'KI wird vorbereitet …', error: null, errorCode: null };

function setModelState(next, onProgress) {
  modelState = { ...modelState, ...next };
  onProgress?.({ ...modelState });
}

function configureRuntime() {
  env.allowRemoteModels = true;
  env.allowLocalModels = false;
  env.useBrowserCache = true;
  if ('useWasmCache' in env) env.useWasmCache = true;
  try {
    env.backends.onnx.wasm.wasmPaths = new URL('./vendor/', window.location.href).href;
  } catch {
    // Browser-only runtime; a missing override is handled by model initialization.
  }
}

configureRuntime();

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
    runtime: 'transformersjs-local-bundle',
    label: hasWebGPU ? 'Lokale KI verfügbar' : 'Lokale KI nicht verfügbar',
  };
}

export function getLocalAiStatus() {
  return { ...modelState };
}

export function isLocalAiReady() {
  return Boolean(generatorInstance);
}

function mapLoadProgress(info, onProgress) {
  let percent = modelState.percent || 3;
  if (info?.status === 'progress_total' && Number.isFinite(info.progress)) {
    percent = Math.max(4, Math.min(96, Math.round(info.progress)));
  } else if (info?.status === 'progress' && Number.isFinite(info.progress)) {
    percent = Math.max(percent, Math.min(94, Math.round(info.progress)));
  } else if (info?.status === 'ready') {
    percent = 96;
  }

  let text = 'Sprachmodell wird heruntergeladen und lokal gespeichert …';
  if (info?.status === 'ready' || percent >= 95) text = 'Sprachmodell wird auf dem Gerät gestartet …';
  if (info?.status === 'done' && percent < 95) text = 'Modelldateien werden lokal vorbereitet …';

  setModelState({ status: 'loading', percent, text, error: null, errorCode: null }, onProgress);
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
      const error = new Error('Der vorherige Modellstart wurde nicht sauber abgeschlossen. Ein automatischer erneuter Download wurde gestoppt. Starte die KI nur über „KI erneut starten“, wenn du bewusst einen neuen Versuch auslösen möchtest.');
      error.code = 'PREVIOUS_START_INCOMPLETE';
      setModelState({ status: 'error', percent: 0, text: 'Automatischer Neustart gestoppt', error: error.message, errorCode: error.code }, onProgress);
      throw error;
    }

    markStartGuard();
    generatorPromise = (async () => {
      setModelState({ status: 'loading', percent: 2, text: 'Lokale KI-Laufzeit wird vom Gerät geladen …', error: null, errorCode: null }, onProgress);
      try { await navigator.storage?.persist?.(); } catch { /* optional */ }

      const generator = await pipeline('text-generation', MODEL_ID, {
        revision: MODEL_REVISION,
        device: 'webgpu',
        dtype: {
          embed_tokens: MODEL_DTYPE,
          decoder_model_merged: MODEL_DTYPE,
        },
        progress_callback: (info) => mapLoadProgress(info, onProgress),
      });

      generatorInstance = generator;
      modelInfo = {
        id: MODEL_ID,
        label: MODEL_LABEL,
        profile: MODEL_PROFILE,
        revision: MODEL_REVISION,
        dtype: MODEL_DTYPE,
        device: 'webgpu',
        runtimeLabel: 'Transformers.js 4.2.0 · ONNX Runtime WebGPU · lokal gebündelt',
        persistentCache: 'Browser-Cache',
        pipeline: 'Qwen 3.5 0.8B Textpfad → HEB-Gesamtsynthese → lokale Sicherheitsprüfung',
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

function extractAssistantText(output, streamedText) {
  const generated = output?.[0]?.generated_text;
  if (Array.isArray(generated)) {
    const last = generated.at(-1);
    if (last?.content) return String(last.content).trim();
  }
  if (typeof generated === 'string') return generated.trim();
  return String(streamedText || '').trim();
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

  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (text) => {
      const piece = String(text || '');
      if (!piece) return;
      streamedText += piece;
      generatedChars += piece.length;
      chunkCount += 1;
      setModelState({
        status: 'generating',
        percent: 0,
        phase: 'writing',
        text: chunkCount < 3 ? 'KI ordnet die HEB-Unterpunkte zu …' : 'KI formuliert den HEB-Entwurf …',
        generatedChars,
        completionTokens: 0,
        error: null,
        errorCode: null,
      }, onProgress);
    },
  });

  const output = await generator(messages, {
    max_new_tokens: MAX_NEW_TOKENS,
    do_sample: false,
    repetition_penalty: 1.05,
    streamer,
  });

  return extractAssistantText(output, streamedText);
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
    throw new Error(`Der erzeugte Text hat die Qualitätsprüfung nicht bestanden (${validation.problems.join(' | ')}).`);
  }

  setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null, errorCode: null }, onProgress);
  return makeFinalText(formType, parsed);
}

export function getModelInfo() {
  return modelInfo ? { ...modelInfo } : {
    id: MODEL_ID,
    label: MODEL_LABEL,
    profile: MODEL_PROFILE,
    revision: MODEL_REVISION,
    dtype: MODEL_DTYPE,
    device: 'webgpu',
    runtimeLabel: 'Transformers.js 4.2.0 · ONNX Runtime WebGPU · lokal gebündelt',
    persistentCache: 'Browser-Cache',
    pipeline: 'Qwen 3.5 0.8B Textpfad → HEB-Gesamtsynthese → lokale Sicherheitsprüfung',
  };
}
