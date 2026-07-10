import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const outputDirectory = 'work/environment-audit';
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-first-run'],
});

try {
  await mkdir(outputDirectory, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:5182/?autostart=1', { waitUntil: 'networkidle', timeout: 120_000 });
  await page.locator("body[data-ready='true']").waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForTimeout(1_500);
  await page.evaluate(() => {
    document.querySelector('[data-supervisor-ack]')?.click();
    window.__COR_TEST__?.hud?.setVisible(false);
  });
  await page.evaluate(() => window.__COR_TEST__?.setEnvironmentRotation(5.8));
  for (const rotation of [0, .45, .9, 1.35]) {
    await page.evaluate((value) => {
      const crawler = window.__COR_TEST__?.site?.props?.get('crawlerCrane');
      if (crawler) crawler.rotation.y = value;
    }, rotation);
    await page.waitForTimeout(400);
    const label = rotation.toFixed(1).replace('.', '-');
    await page.screenshot({ path: `${outputDirectory}/crane-${label}.png`, type: 'png' });
  }
} finally {
  await browser.close();
}
