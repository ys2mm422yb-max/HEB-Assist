import { test, expect } from '@playwright/test';

const MODEL_PROFILE = 'transformersjs-qwen3.5-0.8b-text-only-adaptive-q4-heb-v13';
const START_GUARD_KEY = 'heb-assist-ai-start-guard-v1';

async function openWithoutExternalNetwork(page) {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test('HEB-Auswahl und offizielle Bereiche sind vollständig vorhanden', async ({ page }) => {
  await openWithoutExternalNetwork(page);
  await expect(page.locator('.topbar h1')).toHaveText('HEB Assist');
  await expect(page.locator('#reportType option')).toHaveCount(3);
  await expect(page.locator('#area option')).toHaveCount(5);
  await expect(page.locator('#area option').nth(0)).toContainText('Aufnahme und Gestaltung persönlicher, sozialer Beziehungen');
  await expect(page.locator('#area option').nth(4)).toContainText('Umgang mit den Auswirkungen der Behinderung');
  await expect(page.locator('.startup-note')).toContainText('Qwen 3.5 0.8B');
  await expect(page.locator('.startup-note')).not.toContainText('Gemma');
  await expect(page.locator('#notes')).toBeDisabled();
  await expect(page.locator('#generateButton')).toBeDisabled();
});

test('PWA-Grunddateien und lokal gebündelte KI-Laufzeit sind erreichbar', async ({ page, request }) => {
  await openWithoutExternalNetwork(page);
  const manifest = await request.get('/manifest.webmanifest'); expect(manifest.ok()).toBeTruthy();
  const sw = await request.get('/sw.js'); expect(sw.ok()).toBeTruthy();
  const runtime = await request.get('/vendor/transformers.js'); expect(runtime.ok()).toBeTruthy(); expect((await runtime.text()).length).toBeGreaterThan(100000);
  const wasmLoader = await request.get('/vendor/ort-wasm-simd-threaded.jsep.mjs'); expect(wasmLoader.ok()).toBeTruthy();
  const wasm = await request.get('/vendor/ort-wasm-simd-threaded.jsep.wasm'); expect(wasm.ok()).toBeTruthy();
  const generationCss = await request.get('/generation-progress.css'); expect(generationCss.ok()).toBeTruthy();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(overflow).toBeLessThanOrEqual(2);
});

test('lokale Transformers.js-Runtime enthält Qwen-3.5-Textsupport und lädt ohne npm-Auflösungsfehler', async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    try {
      const runtime = await import('/vendor/transformers.js?browser-import-test=3');
      return {
        ok: typeof runtime.pipeline === 'function',
        qwenText: typeof runtime.Qwen3_5ForCausalLM === 'function',
        error: '',
      };
    } catch (error) {
      return { ok: false, qwenText: false, error: error?.message || String(error) };
    }
  });
  expect(result.ok, result.error).toBeTruthy();
  expect(result.qwenText, 'Transformers.js 4.2.0 exportiert Qwen3_5ForCausalLM nicht').toBeTruthy();
  expect(result.error).not.toMatch(/does not resolve to a valid URL|Failed to resolve module specifier|onnxruntime-(?:web|common|node)/i);
});

test('Crash-Loop-Schutz verhindert einen automatischen zweiten Großdownload', async ({ page }) => {
  await page.addInitScript(({ key, profile }) => {
    try { Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true }); } catch {}
    localStorage.setItem(key, JSON.stringify({ profile, startedAt: Date.now() }));
  }, { key: START_GUARD_KEY, profile: MODEL_PROFILE });
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#startupTitle')).toHaveText('Automatischer KI-Neustart gestoppt');
  await expect(page.locator('#startupStage')).toHaveText('Erneuter Download gestoppt');
  await expect(page.locator('#startupRetryButton')).toBeVisible();
});

test('App-Shell benötigt für die KI-Laufzeit keine externe JavaScript-CDN', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => { const url = request.url(); if (/^https:\/\//.test(url)) externalRequests.push(url); });
  await openWithoutExternalNetwork(page); await page.waitForTimeout(500);
  expect(externalRequests.some((url) => /esm\.run|jsdelivr|unpkg/i.test(url))).toBeFalsy();
});

test('Lade-/Fehleroberfläche enthält keine rohen englischen Modellmeldungen', async ({ page }) => {
  await openWithoutExternalNetwork(page); await page.waitForTimeout(500);
  const text = await page.locator('body').innerText(); expect(text).not.toMatch(/Downloading model|Loading model|Preparing model|Model loading/i);
});

test('Dark Mode folgt dem Systemmodus', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' }); await openWithoutExternalNetwork(page);
  const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim().toLowerCase()); expect(surface).toBe('#15201e');
});
