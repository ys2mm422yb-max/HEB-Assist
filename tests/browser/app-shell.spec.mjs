import { test, expect } from '@playwright/test';

const MODEL_PROFILE = 'webllm-qwen3.5-0.8b-q4f16-heb-v15';
const START_GUARD_KEY = 'heb-assist-ai-start-guard-v1';
const V15_GUARD_MIGRATION_KEY = 'heb-assist-v15-webllm-guard-migrated';

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
  await expect(page.locator('.startup-note')).toContainText('WebLLM');
  await expect(page.locator('.startup-note')).not.toContainText('Gemma');
  await expect(page.locator('#notes')).toBeDisabled();
  await expect(page.locator('#generateButton')).toBeDisabled();
});

test('PWA-Grunddateien und lokal gebündelte KI-Laufzeit sind erreichbar', async ({ page, request }) => {
  await openWithoutExternalNetwork(page);
  const manifest = await request.get('/manifest.webmanifest'); expect(manifest.ok()).toBeTruthy();
  const sw = await request.get('/sw.js'); expect(sw.ok()).toBeTruthy();
  const runtime = await request.get('/vendor/webllm.js'); expect(runtime.ok()).toBeTruthy(); expect((await runtime.text()).length).toBeGreaterThan(100000);
  const generationCss = await request.get('/generation-progress.css'); expect(generationCss.ok()).toBeTruthy();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(overflow).toBeLessThanOrEqual(2);
});

test('lokale WebLLM-Runtime enthält Qwen 3.5 0.8B und lädt ohne npm-Auflösungsfehler', async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(async () => {
    try {
      const runtime = await import('/vendor/webllm.js?browser-import-test=15');
      return {
        ok: typeof runtime.CreateMLCEngine === 'function',
        qwenText: Boolean(runtime.prebuiltAppConfig?.model_list?.some((entry) => entry.model_id === 'Qwen3.5-0.8B-q4f16_1-MLC')),
        error: '',
      };
    } catch (error) {
      return { ok: false, qwenText: false, error: error?.message || String(error) };
    }
  });
  expect(result.ok, result.error).toBeTruthy();
  expect(result.qwenText, 'WebLLM 0.2.84 enthält Qwen3.5-0.8B-q4f16_1-MLC nicht').toBeTruthy();
  expect(result.error).not.toMatch(/does not resolve to a valid URL|Failed to resolve module specifier|onnxruntime-(?:web|common|node)/i);
});

test('Crash-Loop-Schutz verhindert nach der v15-Migration einen automatischen zweiten Großdownload', async ({ page }) => {
  await page.addInitScript(({ guardKey, migrationKey, profile }) => {
    try { Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true }); } catch {}
    localStorage.setItem(migrationKey, '1');
    localStorage.setItem(guardKey, JSON.stringify({ profile, startedAt: Date.now() }));
  }, { guardKey: START_GUARD_KEY, migrationKey: V15_GUARD_MIGRATION_KEY, profile: MODEL_PROFILE });
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
