import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

const transformersSource = 'node_modules/@huggingface/transformers/dist/transformers.min.js';
const ortDir = 'node_modules/onnxruntime-web/dist';
const vendorDir = 'vendor';
const requiredSources = [
  transformersSource,
  `${ortDir}/ort-wasm-simd-threaded.jsep.mjs`,
  `${ortDir}/ort-wasm-simd-threaded.jsep.wasm`,
];

for (const source of requiredSources) {
  if (!existsSync(source)) throw new Error(`Benötigte Runtime-Datei fehlt: ${source}`);
}

mkdirSync(vendorDir, { recursive: true });
cpSync(transformersSource, `${vendorDir}/transformers.js`);
cpSync(`${ortDir}/ort-wasm-simd-threaded.jsep.mjs`, `${vendorDir}/ort-wasm-simd-threaded.jsep.mjs`);
cpSync(`${ortDir}/ort-wasm-simd-threaded.jsep.wasm`, `${vendorDir}/ort-wasm-simd-threaded.jsep.wasm`);

const runtime = readFileSync(`${vendorDir}/transformers.js`, 'utf8');
const forbiddenBareImport = /(?:from\s*|import\s*\()\s*['"](?:onnxruntime-common|onnxruntime-web(?:\/webgpu)?|onnxruntime-node)['"]/;
if (forbiddenBareImport.test(runtime)) {
  throw new Error('Die Browser-Runtime enthält weiterhin einen nicht aufgelösten ONNX-npm-Import.');
}
if (runtime.length < 100000) {
  throw new Error('Die gebündelte Transformers.js-Browser-Runtime ist unerwartet klein.');
}

console.log('Offizielle gebündelte Transformers.js-Browser-Runtime vorbereitet.');
