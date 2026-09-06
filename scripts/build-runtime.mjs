import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const runtimeSource = 'node_modules/@mlc-ai/web-llm/lib/index.js';
const vendorDir = 'vendor';
const runtimeTarget = `${vendorDir}/webllm.js`;
const runtimeMarker = 'HEB Assist local WebLLM runtime 0.2.84';

if (!existsSync(runtimeSource)) {
  throw new Error(`Benötigte WebLLM-Runtime fehlt: ${runtimeSource}`);
}

mkdirSync(vendorDir, { recursive: true });
let runtime = readFileSync(runtimeSource, 'utf8');

if (!runtime.includes('Qwen3.5-0.8B-q4f16_1-MLC')) {
  throw new Error('WebLLM 0.2.84 enthält das benötigte Qwen-3.5-0.8B-Modellprofil nicht.');
}
if (!runtime.includes('CreateMLCEngine')) {
  throw new Error('WebLLM-Browser-Runtime exportiert CreateMLCEngine nicht wie erwartet.');
}
if (runtime.length < 100000) {
  throw new Error('Die gebündelte WebLLM-Browser-Runtime ist unerwartet klein.');
}

runtime = runtime.replace(/\n?\/\/# sourceMappingURL=.*$/m, '');
runtime = `/* ${runtimeMarker} */\n${runtime}`;
writeFileSync(runtimeTarget, runtime);

console.log('WebLLM-0.2.84-Browser-Runtime für Qwen 3.5 0.8B lokal vorbereitet.');
