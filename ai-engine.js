import { HEB_SYSTEM_RULES, HEB_FORM_CONFIG, getOutputInstruction, FEW_SHOT_EXAMPLES } from './heb-knowledge.js';

const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0';

let generatorPromise = null;
let modelInfo = null;

export function getLocalAiCapability() {
  const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
  return {
    hasWebGPU,
    supported: hasWebGPU,
    label: hasWebGPU ? 'Lokale KI verfügbar' : 'Lokale KI nicht verfügbar',
  };
}

async function chooseDtype() {
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (adapter?.features?.has('shader-f16')) return 'q4f16';
  } catch {
    // q4 remains the safer fallback.
  }
  return 'q4';
}

async function loadGenerator(onProgress) {
  if (!getLocalAiCapability().supported) {
    throw new Error('Dieses Gerät bzw. dieser Browser stellt WebGPU aktuell nicht bereit.');
  }

  if (!generatorPromise) {
    generatorPromise = (async () => {
      onProgress?.({ phase: 'library', percent: 3, text: 'KI-Bibliothek wird geladen…' });
      const { pipeline, env } = await import(TRANSFORMERS_URL);

      if (env) {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
      }

      const dtype = await chooseDtype();
      modelInfo = { id: MODEL_ID, dtype, device: 'webgpu' };
      onProgress?.({ phase: 'model', percent: 8, text: 'Lokales Sprachmodell wird vorbereitet…' });

      const pipe = await pipeline('text-generation', MODEL_ID, {
        device: 'webgpu',
        dtype,
        progress_callback: (event) => {
          if (!event) return;
          const progress = typeof event.progress === 'number' ? Math.round(event.progress) : null;
          if (progress !== null) {
            const bounded = Math.min(88, Math.max(8, Math.round(8 + progress * 0.8)));
            onProgress?.({ phase: 'model', percent: bounded, text: `Modell wird lokal geladen… ${progress}%` });
          }
        },
      });

      onProgress?.({ phase: 'ready', percent: 90, text: 'Lokale KI ist bereit.' });
      return pipe;
    })().catch((error) => {
      generatorPromise = null;
      throw error;
    });
  }

  return generatorPromise;
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

  if (typeof generated === 'string') {
    return generated.trim();
  }

  if (typeof output?.[0]?.text === 'string') {
    return output[0].text.trim();
  }

  throw new Error('Die lokale KI hat kein verwertbares Ergebnis geliefert.');
}

export async function generateHebText({ notes, area, formType, mode, onProgress }) {
  const generator = await loadGenerator(onProgress);
  const messages = buildMessages({ notes, area, formType, mode });

  onProgress?.({ phase: 'generate', percent: 93, text: 'Formulierung wird auf diesem Gerät erstellt…' });

  const output = await generator(messages, {
    max_new_tokens: mode === 'complete' ? 420 : 260,
    do_sample: false,
    repetition_penalty: 1.08,
  });

  onProgress?.({ phase: 'done', percent: 100, text: 'Fertig.' });
  return extractAssistantText(output);
}

export function getModelInfo() {
  return modelInfo;
}
