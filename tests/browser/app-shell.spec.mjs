import { test, expect } from '@playwright/test';

async function openWithoutModelDownload(page) {
  await page.route('https://esm.run/**', (route) => route.abort());
  await page.route('https://*.huggingface.co/**', (route) => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

test('HEB-Auswahl und offizielle Bereiche sind vollständig vorhanden', async ({ page }) => {
  await openWithoutModelDownload(page);

  await expect(page.locator('.topbar h1')).toHaveText('HEB Assist');
  await expect(page.locator('#reportType option')).toHaveCount(3);
  await expect(page.locator('#area option')).toHaveCount(5);
  await expect(page.locator('#area option').nth(0)).toContainText('Aufnahme und Gestaltung persönlicher, sozialer Beziehungen');
  await expect(page.locator('#area option').nth(4)).toContainText('Umgang mit den Auswirkungen der Behinderung');

  // Ohne vollständig gestartetes echtes Sprachmodell muss die Eingabe gesperrt bleiben.
  await expect(page.locator('#notes')).toBeDisabled();
  await expect(page.locator('#generateButton')).toBeDisabled();
});

test('PWA-Grunddateien sind erreichbar und die Oberfläche bleibt im Viewport', async ({ page, request }) => {
  await openWithoutModelDownload(page);

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();

  const sw = await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
});

test('Lade-/Fehleroberfläche enthält keine rohen englischen Modellmeldungen', async ({ page }) => {
  await openWithoutModelDownload(page);
  await page.waitForTimeout(500);

  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/Downloading model|Loading model|Preparing model|Model loading/i);
});

test('Dark Mode folgt dem Systemmodus', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openWithoutModelDownload(page);

  const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface').trim().toLowerCase());
  expect(surface).toBe('#15201e');
});
