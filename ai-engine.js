import { HEB_SYSTEM_RULES, HEB_FORM_CONFIG, getOutputInstruction, FEW_SHOT_EXAMPLES } from './heb-knowledge.js';

const STANDARD_MODEL = {
  id: 'onnx-community/Qwen2.5-0.5B-Instruct',
  label: 'Qwen2.5 0.5B',
  profile: 'standard',
};

const APPLE_MOBILE_MODEL = {
  id: 'onnx-community/gemma-3-270m-it-ONNX',
  label: 'Gemma 3 270M',
  profile: 'apple-mobile-compact',
};

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';
const ORT_WEB_VERSION = '1.26.0-dev.20260416-b7804b056c';
const ORT_ASYNCIFY_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_WEB_VERSION}/dist/`;

const APPLE_MOBILE_SYSTEM_RULES = `Du bist HEB Assist. Formuliere professionelles, neutrales und ressourcenorientiertes Deutsch für die offiziellen HEB-Bögen A, B und C.
Verbindlich:
- Nutze ausschließlich Informationen aus der Eingabe. Nichts erfinden oder ergänzen.
- Keine Diagnosen, Symptome, Fähigkeiten, Risiken, Ressourcen, Entwicklungen, Ziele, Maßnahmen oder Hilfebedarfe hinzufügen, die nicht belegt sind.
- Keine Namen verwenden; schreibe „die leistungsberechtigte Person“ oder „die Person“.
- Beobachtung, Selbstaussage und fachliche Einschätzung nicht vermischen.
- Unterstützungsbedarf konkret und wertfrei beschreiben.
- Keine formale Hilfebedarfsstufe auswählen, wenn sie nicht ausdrücklich genannt wurde.
- HEB-Bogentyp, Bereich und geforderte Unterpunkte exakt beachten.
- Knapp, fachlich und gut verständlich formulieren.`;

let generatorPromise = null;
let generatorInstance = null;
let modelInfo = null;
let activeModel = null;
let activeRuntime = null;
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

function isAppleMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const classicIOS = /iPhone|iPad|iPod/i.test(ua);
  const iPadDesktopUA = navigator.platform === 'MacIntel' && Number(navigator.maxTouchPoints || 0) > 1;
  return classicIOS || iPadDesktopUA;
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

function selectModel() {
  return isAppleMobileDevice() ? APPLE_MOBILE_MODEL : STANDARD_MODEL;
}

export function getLocalAiCapability() {
  const appleMobile = isAppleMobileDevice();
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
  const model = selectModel();
  return {
    hasWebGPU,
    supported: appleMobile ? true : hasWebGPU,
    safari26Plus: isSafari26Plus(),
    appleMobile,
    modelProfile: model.profile,
    modelLabel: model.label,
    runtime: appleMobile ? 'wasm' : 'webgpu',
    label: appleMobile || hasWebGPU ? 'Lokale KI verfügbar' : 'Lokale KI nicht verfügbar',
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

  if (isAppleMobileDevice()) {
    // Safari/iOS is currently much more stable with the plain WASM backend
    // than with the JSEP/WebGPU path during autoregressive generation.
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.simd = true;
    }
    return;
  }

  // Desktop Safari >= 26 still needs the asyncify ONNX Runtime Web build
  // for the WebGPU backend to initialise correctly.
  if (isSafari26Plus() && env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = {
      mjs: `${ORT_ASYNCIFY_BASE}ort-wasm-simd-threaded.asyncify.mjs`,
      wasm: `${ORT_ASYNCIFY_BASE}ort-wasm-simd-threaded.asyncify.wasm`,
    };
  }
}

async function selectRuntime() {
  if (isAppleMobileDevice()) {
    return { device: 'wasm', dtype: 'q4', label: 'stabiler iPhone-/iPad-Modus' };
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('WebGPU ist vorhanden, aber der Browser konnte keinen GPU-Adapter bereitstellen.');
  }

  return {
    device: 'webgpu',
    dtype: adapter.features?.has('shader-f16') ? 'q4f16' : 'q4',
    label: 'WebGPU-Modus',
  };
}

async function loadGenerator(onProgress) {
  if (generatorInstance) {
    setModelState({ status: 'ready', percent: 100, text: 'KI ist bereit ✓', error: null }, onProgress);
    return generatorInstance;
  }

  if (!getLocalAiCapability().supported) {
    const error = new Error('Dieses Gerät bzw. dieser Browser stellt die benötigte lokale KI-Laufzeit aktuell nicht bereit.');
    setModelState({ status: 'error', percent: 0, text: 'KI nicht verfügbar', error: error.message }, onProgress);
    throw error;
  }

  if (!generatorPromise) {
    generatorPromise = (async () => {
      activeModel = selectModel();
      const compactText = activeModel.profile === 'apple-mobile-compact'
        ? 'Kompaktes iPhone-/iPad-Sprachmodell wird vorbereitet …'
        : 'Sprachmodell wird vorbereitet …';

      setModelState({ status: 'loading', percent: 3, text: 'KI-Bibliothek wird geladen …', error: null }, onProgress);
      const { pipeline, env } = await import(TRANSFORMERS_URL);
      configureRuntimeForPlatform(env);

      activeRuntime = await selectRuntime();
      setModelState({ status: 'loading', percent: 8, text: compactText }, onProgress);

      const pipe = await pipeline('text-generation', activeModel.id, {
        device: activeRuntime.device,
        dtype: activeRuntime.dtype,
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
      modelInfo = {
        id: activeModel.id,
        label: activeModel.label,
        profile: activeModel.profile,
        dtype: activeRuntime.dtype,
        device: activeRuntime.device,
        runtimeLabel: activeRuntime.label,
        safari26Workaround: !isAppleMobileDevice() && isSafari26Plus(),
      };
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
  const mobile = isAppleMobileDevice();

  const examples = mobile
    ? ''
    : FEW_SHOT_EXAMPLES
        .map((example, index) => `Beispiel ${index + 1}\nEingabe: ${example.input}\nGute fachliche Formulierung:\n${example.output}`)
        .join('\n\n');

  const exampleBlock = examples ? `\n\nBeispiele für Stil und Faktentreue:\n${examples}` : '';
  const lengthRule = mobile
    ? '\nFormuliere kompakt. Der gesamte Entwurf soll möglichst unter 170 Wörtern bleiben.'
    : '';

  const userPrompt = `HEB-Bogen: ${form.label}\nHEB-Bereich: ${area}\nAusgabe: ${selectedModeLabel}\n\nAufgabe:\n${instruction}${lengthRule}${exampleBlock}\n\nFallbeschreibung:\n${notes}\n\nGib ausschließlich den fertigen fachlichen HEB-Text aus. Keine Vorbemerkung und keine zusätzlichen Tatsachen.`;

  return [
    { role: 'system', content: mobile ? APPLE_MOBILE_SYSTEM_RULES : HEB_SYSTEM_RULES },
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
  const mobile = isAppleMobileDevice();

  onProgress?.({ status: 'generating', percent: 100, text: 'KI formuliert …', error: null });

  const output = await generator(messages, {
    max_new_tokens: mobile ? 220 : (mode === 'complete' ? 420 : 260),
    do_sample: false,
    repetition_penalty: 1.06,
    return_full_text: false,
    use_cache: true,
  });

  return extractAssistantText(output);
}

export function getModelInfo() {
  return modelInfo;
}
