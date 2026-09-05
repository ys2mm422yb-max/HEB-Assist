import { HEB_SYSTEM_RULES, HEB_FORM_CONFIG, getOutputInstruction, FEW_SHOT_EXAMPLES } from './heb-knowledge.js';

const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
const ORT_WEB_VERSION = '1.26.0-dev.20260416-b7804b056c';
const ORT_ASYNCIFY_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_WEB_VERSION}/dist/`;

let generatorPromise = null;
let generatorInstance = null;
let modelInfo = null;
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

function isSafari26Plus() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';
  const isSafari = vendor.includes('Apple') && !/CriOS|FxiOS|EdgiOS|OPiOS|mercury|brave|Chrome|Android/i.test(ua);
  if (!isSafari) return false;
  const match = ua.match(/Version\/(\d+)/);
  return match ? Number.parseInt(match[1], 10) >= 26 : false;
}

export function getLocalAiCapability() {
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
  return {
    hasWebGPU,
    supported: hasWebGPU,
    safari26Plus: isSafari26Plus(),
    label: hasWebGPU ? 'Lokale KI verfügbar' : 'Lokale KI nicht verfügbar',
  };
}

export function getLocalAiStatus() {
  return { ...modelState };
}

export function isLocalAiReady() {
  return Boolean(generatorInstance);
}

function configureRuntimeForPlatform(env) {
  if (!env) return;

  env.allowLocalModels = false;
  env.useBrowserCache = true;

  // Transformers.js 4.2.0 predates the upstream Safari-26 WebGPU fix
  // (huggingface/transformers.js#1700). Safari >= 26 needs the asyncify
  // ONNX Runtime Web build for the WebGPU backend to initialise correctly.
  if (isSafari26Plus() && env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = {
      mjs: `${ORT_ASYNCIFY_BASE}ort-wasm-simd-threaded.asyncify.mjs`,
      wasm: `${ORT_ASYNCIFY_BASE}ort-wasm-simd-threaded.asyncify.wasm`,
    };
  }
}

async function chooseDtype() {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('WebGPU ist vorhanden, aber Safari konnte keinen GPU-Adapter bereitstellen.');
  }
  return adapter.features?.has('shader-f16') ? 'q4f16' : 'q4';
}

async function loadGenerator(onProgress) {
  if (generatorInstance) {
    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    return generatorInstance;
  }

  if (!getLocalAiCapability().supported) {
    const error = new Error('Dieses Gerät bzw. dieser Browser stellt WebGPU aktuell nicht bereit.');
    setModelState({ status: 'error', percent: 0, text: 'KI nicht verfügbar', error: error.message }, onProgress);
    throw error;
  }

  if (!generatorPromise) {
    generatorPromise = (async () => {
      setModelState({ status: 'loading', percent: 3, text: 'KI-Bibliothek wird geladen …', error: null }, onProgress);
      const { pipeline, env } = await import(TRANSFORMERS_URL);
      configureRuntimeForPlatform(env);

      const dtype = await chooseDtype();
      setModelState({ status: 'loading', percent: 8, text: 'Sprachmodell wird vorbereitet …' }, onProgress);

      const pipe = await pipeline('text-generation', MODEL_ID, {
        device: 'webgpu',
        dtype,
        progress_callback: (event) => {
          if (!event) return;
          const progress = typeof event.progress === 'number' ? Math.round(event.progress) : null;
          if (progress === null) return;

          if (progress >= 100) {
            setModelState({
              status: 'loading',
              percent: 97,
              text: 'Download abgeschlossen · KI wird gestartet …',
            }, onProgress);
            return;
          }

          const bounded = Math.min(95, Math.max(8, progress));
          setModelState({
            status: 'loading',
            percent: bounded,
            text: `KI-Dateien werden geladen · ${progress}%`,
          }, onProgress);
        },
      });

      generatorInstance = pipe;
      modelInfo = { id: MODEL_ID, dtype, device: 'webgpu', safari26Workaround: isSafari26Plus() };
      setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
      return pipe;
    })().catch((error) => {
      generatorPromise = null;
      generatorInstance = null;
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

  return generatorPromise;
}

export function preloadLocalAi(onProgress) {
  return loadGenerator(onProgress);
}

function buildMessages({ notes, area, formType, mode }) {
  const form = HEB_FORM_CONFIG[formType] || HEB_FORM_CONFIG.A;
  const instruction = getOutputInstruction(formType, mode);
  const selectedModeLabel = form.modes.find(([value]) => value === mode)?.[1] || form.modes[0][1];

  const examples = FEW_SHOT_EXAMPLES
    .map((example, index) => `Beispiel ${index + 1}\nEingabe: ${example.input}\nGute fachliche Formulierung:\n${example.output}`)
    .join('\n\n');

  const userPrompt = `Ausgewählter HEB-Bogen: ${form.label}\nAusgewählter HEB-Bereich: ${area}\nAusgewähltes Feld: ${selectedModeLabel}\n\nAufgabe:\n${instruction}\n\nBeispiele für Stil und Faktentreue:\n${examples}\n\nFallbeschreibung:\n${notes}\n\nErstelle jetzt ausschließlich die fachliche Formulierung für das ausgewählte Feld. Verwende keine Vorbemerkung, keine allgemeinen Warnhinweise und keine Informationen, die nicht in der Fallbeschreibung enthalten sind.`;

  return [
    { role: 'system', content: HEB_SYSTEM_RULES },
    { role: 'user', content: userPrompt },
  ];
}

function extractAssistantText(output) {
  const generated = output?.[0]?.generated_text;

  if (Array.isArray(generated)) {
    const lastAssistant = [...generated].reverse().find((item) => item?.role === 'assistant');
    if (lastAssistant?.content) return String(lastAssistant.content).trim();
  }

  if (typeof generated === 'string') return generated.trim();
  if (typeof output?.[0]?.text === 'string') return output[0].text.trim();
  throw new Error('Die lokale KI hat kein verwertbares Ergebnis geliefert.');
}

export async function generateHebText({ notes, area, formType, mode = 'complete', onProgress }) {
  const generator = await loadGenerator(onProgress);
  const messages = buildMessages({ notes, area, formType, mode });

  onProgress?.({ status: 'generating', percent: 100, text: 'KI formuliert …', error: null });

  const output = await generator(messages, {
    max_new_tokens: mode === 'complete' ? 420 : 260,
    do_sample: false,
    repetition_penalty: 1.08,
  });

  return extractAssistantText(output);
}

export function getModelInfo() {
  return modelInfo;
}
