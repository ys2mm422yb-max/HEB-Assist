import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const transformersSource = 'node_modules/@huggingface/transformers/dist/transformers.js';
const ortDir = 'node_modules/onnxruntime-web/dist';
const vendorDir = 'vendor';
const requiredSources = [
  transformersSource,
  `${ortDir}/ort-wasm-simd-threaded.jsep.mjs`,
  `${ortDir}/ort-wasm-simd-threaded.jsep.wasm`,
];
const upstreamFixMarker = 'HEB Assist runtime patch: huggingface/transformers.js#1664@f7487c737aa8cafbc106c9adf69dc9578c8f3fe0';

for (const source of requiredSources) {
  if (!existsSync(source)) throw new Error(`Benötigte Runtime-Datei fehlt: ${source}`);
}

mkdirSync(vendorDir, { recursive: true });
let runtime = readFileSync(transformersSource, 'utf8');

// Transformers.js 4.2.0 has a confirmed upstream bug (#1663): when a
// progress_callback is active, get_file_metadata() can use different memoize
// keys for omitted vs. explicit default options and fetch model files more than
// once. Upstream fixed this in PR #1664. Until a newer npm release contains the
// fix, apply that exact normalization to the locally bundled runtime.
const buggyMemoKeyPattern = /([A-Za-z_$][\w$]*)\?\.revision,\s*\1\?\.cache_dir,\s*\1\?\.local_files_only,/g;
const buggyMemoKeyMatches = [...runtime.matchAll(buggyMemoKeyPattern)];
if (buggyMemoKeyMatches.length !== 1) {
  throw new Error(`Transformers.js-4.2.0-Patch abgebrochen: erwartete Memoize-Stelle ${buggyMemoKeyMatches.length}× gefunden statt genau 1×.`);
}
runtime = runtime.replace(buggyMemoKeyPattern, (_match, variable) => [
  `${variable}?.revision ?? 'main',`,
  `${variable}?.cache_dir ?? null,`,
  `${variable}?.local_files_only ?? false,`,
].join('\n'));
runtime = `/* ${upstreamFixMarker} */\n${runtime}`;

const forbiddenBareImport = /(?:from\s*|import\s*\()\s*['"](?:onnxruntime-common|onnxruntime-web(?:\/webgpu)?|onnxruntime-node)['"]/;
if (forbiddenBareImport.test(runtime)) {
  throw new Error('Die Browser-Runtime enthält weiterhin einen nicht aufgelösten ONNX-npm-Import.');
}
if (!runtime.includes(upstreamFixMarker)) {
  throw new Error('Der bestätigte Transformers.js-Doppel-Download-Fix wurde nicht in die Browser-Runtime übernommen.');
}
if (runtime.length < 100000) {
  throw new Error('Die gebündelte Transformers.js-Browser-Runtime ist unerwartet klein.');
}

writeFileSync(`${vendorDir}/transformers.js`, runtime);
cpSync(`${ortDir}/ort-wasm-simd-threaded.jsep.mjs`, `${vendorDir}/ort-wasm-simd-threaded.jsep.mjs`);
cpSync(`${ortDir}/ort-wasm-simd-threaded.jsep.wasm`, `${vendorDir}/ort-wasm-simd-threaded.jsep.wasm`);

console.log('Transformers.js-Browser-Runtime mit bestätigtem Upstream-Fix #1664 vorbereitet.');
