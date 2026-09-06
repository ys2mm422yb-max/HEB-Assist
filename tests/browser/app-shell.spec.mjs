import { test, expect } from '@playwright/test';

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

  // Ohne vollständig gestartetes echtes Sprachmodell muss die Eingabe gesperrt bleiben.
  await expect(page.locator('#notes')).toBeDisabled();
  await expect(page.locator('#generateButton')).toBeDisabled();
});

test('PWA-Grunddateien und lokal gebündelte KI-Laufzeit sind erreichbar', async ({ page, request }) => {
  await openWithoutExternalNetwork(page);

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();

  const sw = await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();

  const runtime = await request.get('/vendor/webllm.js');
  expect(runtime.ok()).toBeTruthy();
  expect((await runtime.text()).length).toBeGreaterThan(1000);

  const generationCss = await request.get('/generation-progress.css');
  expect(generationCss.ok()).toBeTruthy();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('App-Shell benötigt für die Laufzeit keine externe JavaScript-CDN', async ({ page }) => {
  const externalRequests = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/^https:\/\//.test(url)) externalRequests.push(url);
  });

  await openWithoutExternalNetwork(page);
  await page.waitForTimeout(500);

  expect(externalRequests.some((url) => /esm\.run|jsdelivr|unpkg/i.test(url))).toBeFalsy();
});

test('Lade-/Fehleroberfläche enthält keine rohen englischen Modellmeldungen', async ({ page }) => {
  await openWithoutExternalNetwork(page);
  await page.waitForTimeout(500);

  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Downloading model|Loading model|Preparing model|Model loading/i);
});

test('Dark Mode folgt dem Systemmodus', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openWithoutExternalNetwork(page);

  const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim().toLowerCase());
  expect(surface).toBe('#15201e');
});
