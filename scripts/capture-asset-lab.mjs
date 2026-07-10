import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5182';
const output = process.argv[3] ?? 'work/asset-lab-final';
const assets = (process.argv[4] ?? 'crane,crawler,pier,pipes,cables,fence,ch17').split(',').filter(Boolean);
const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-first-run'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  for (const asset of assets) {
    await page.goto(`${baseUrl}/asset-lab.html?asset=${encodeURIComponent(asset)}`, { waitUntil: 'networkidle', timeout: 120_000 });
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: path.join(output, `${asset}.png`) });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ output, assets, errors }, null, 2));
} finally {
  await browser.close();
}
