import { chromium } from 'playwright-core';

const [, , url, output, widthArg = '1600', heightArg = '900', readySelector = 'body', clickSelector = ''] = process.argv;
const timeoutMs = Number(process.env.CAPTURE_TIMEOUT || 120_000);
if (!url || !output) {
  console.error('Uso: node scripts/capture-page.mjs <url> <salida.png> [ancho] [alto] [selector-listo]');
  process.exit(1);
}

const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-first-run'],
});

try {
  const page = await browser.newPage({
    viewport: { width: Number(widthArg), height: Number(heightArg) },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
  try {
    await page.locator(readySelector).waitFor({ state: 'visible', timeout: timeoutMs });
  } catch (error) {
    console.error(`Errores durante la carga:\n${errors.join('\n') || '(sin eventos de consola)'}`);
    throw error;
  }
  await page.waitForTimeout(1_500);
  if (process.env.PLAYER_POSITION) {
    const [x, z, yaw] = JSON.parse(process.env.PLAYER_POSITION);
    await page.evaluate(([nextX, nextZ, nextYaw]) => window.__COR_TEST__?.setPlayerPosition(nextX, nextZ, nextYaw), [x, z, yaw]);
    await page.waitForTimeout(350);
  }
  if (process.env.CAMERA_PRESET) {
    const preset = JSON.parse(process.env.CAMERA_PRESET);
    await page.evaluate((value) => window.__COR_TEST__?.setCamera(value), preset);
    await page.waitForTimeout(650);
  }
  if (process.env.ENV_ROTATION) {
    await page.evaluate((value) => window.__COR_TEST__?.setEnvironmentRotation(value), Number(process.env.ENV_ROTATION));
    await page.waitForTimeout(350);
  }
  if (clickSelector) {
    await page.locator(clickSelector).first().click();
    await page.waitForTimeout(450);
  }

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 2;
  }
  await page.screenshot({ path: output, type: 'png' });
  console.log(`Captura creada: ${output}`);
} finally {
  await browser.close();
}
