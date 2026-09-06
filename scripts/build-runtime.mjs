import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const transformersSource = 'node_modules/@huggingface/transformers/dist/transformers.web.min.js';
const ortDir = 'node_modules/onnxruntime-web/dist';
const vendorDir = 'vendor';
const bareWebGpuSpecifier = 'onnxruntime-web/webgpu';
const localWebGpuSpecifier = './ort.webgpu.bundle.min.mjs';

const requiredSources = [
  transformersSource,
  `${ortDir}/ort.webgpu.bundle.min.mjs`,
  `${ortDir}/ort-wasm-simd-threaded.jsep.mjs`,
  `${ortDir}/ort-wasm-simd-threaded.jsep.wasm`,
];

for (const source of requiredSources) {
  if (!existsSync(source)) throw new Error(`Benötigte Runtime-Datei fehlt: ${source}`);
}

mkdirSync(vendorDir, { recursive: true });
cpSync(transformersSource, `${vendorDir}/transformers.js`);
cpSync(`${ortDir}/ort.webgpu.bundle.min.mjs`, `${vendorDir}/ort.webgpu.bundle.min.mjs`);
cpSync(`${ortDir}/ort-wasm-simd-threaded.jsep.mjs`, `${vendorDir}/ort-wasm-simd-threaded.jsep.mjs`);
cpSync(`${ortDir}/ort-wasm-simd-threaded.jsep.wasm`, `${vendorDir}/ort-wasm-simd-threaded.jsep.wasm`);

const runtimePath = `${vendorDir}/transformers.js`;
let runtime = readFileSync(runtimePath, 'utf8');
const occurrenceCount = runtime.split(bareWebGpuSpecifier).length - 1;
if (occurrenceCount < 1) {
  throw new Error('Transformers.js enthält den erwarteten onnxruntime-web/webgpu-Import nicht; Runtime-Build muss geprüft werden.');
}

runtime = runtime.replaceAll(bareWebGpuSpecifier, localWebGpuSpecifier);
if (runtime.includes(bareWebGpuSpecifier)) {
  throw new Error('Bare onnxruntime-web/webgpu-Import konnte nicht vollständig ersetzt werden.');
}
if (!runtime.includes(localWebGpuSpecifier)) {
  throw new Error('Lokaler ONNX-WebGPU-Import wurde nicht in Transformers.js eingetragen.');
}
writeFileSync(runtimePath, runtime);

console.log(`Lokale Transformers.js-Runtime vorbereitet; ${occurrenceCount} WebGPU-Import(e) auf ${localWebGpuSpecifier} umgestellt.`);
