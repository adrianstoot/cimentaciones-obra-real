import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://127.0.0.1:5182/?autostart=1';
const executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--no-first-run'],
});

const failures = [];
const consoleErrors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.locator('body[data-ready="true"]').waitFor({ state: 'visible', timeout: 120_000 });
  await page.waitForTimeout(1_200);

  const snapshot = () => page.evaluate(() => window.__COR_TEST__.snapshot());
  const initial = await snapshot();
  await page.screenshot({ path: 'work/acceptance-sunny.png' });

  await page.keyboard.down('w');
  await page.waitForTimeout(1_100);
  const moving = await snapshot();
  await page.keyboard.up('w');
  await page.waitForTimeout(350);
  const stopped = await snapshot();

  const travel = Math.hypot(moving.player.x - initial.player.x, moving.player.z - initial.player.z);
  if (travel < 0.35) failures.push(`Locomoción insuficiente: ${travel.toFixed(3)} m.`);
  if (!['walk', 'run'].includes(moving.animation)) failures.push(`Animación de movimiento incorrecta: ${moving.animation}.`);
  if (Math.abs(stopped.footDelta) > 0.055) failures.push(`Pies fuera de rasante: ${stopped.footDelta.toFixed(4)} m.`);
  if (stopped.bounds.sizeY < 1.55 || stopped.bounds.sizeY > 2.15) failures.push(`Altura del avatar anómala: ${stopped.bounds.sizeY.toFixed(3)} m.`);
  if (stopped.bounds.sizeX > 1.8 || stopped.bounds.sizeZ > 1.8) failures.push(`Rig deformado: ${JSON.stringify(stopped.bounds)}.`);
  if (!stopped.rebar || stopped.rebar.lowerBarCount < 100) failures.push('El sistema técnico de armaduras no está inicializado.');
  if (stopped.obstacles < 8 || stopped.interactions < 3) failures.push('Escena sin densidad funcional suficiente.');

  await page.evaluate(() => {
    for (let step = 0; step < 4; step += 1) window.__COR_TEST__.completeRecommendedAction();
  });
  await page.waitForTimeout(250);
  const defective = await snapshot();
  if (defective.phase !== 'correccion' || !defective.spacingDefect) {
    failures.push(`La inspección no materializó la incidencia: fase=${defective.phase}, defecto=${defective.spacingDefect}.`);
  }

  await page.locator('.cor-hotbar [data-hud-panel="tablet"]').click();
  await page.locator('[data-modal-layer]:not([hidden])').waitFor({ state: 'visible' });
  await page.waitForTimeout(180);
  const tablet = await snapshot();
  if (tablet.activePanel !== 'tablet') failures.push('La tablet no abrió el panel de inspección.');
  if (!tablet.inspectionOverlay) failures.push('La RA no resaltó la barra desplazada.');
  await page.screenshot({ path: 'work/acceptance-tablet.png' });
  await page.locator('.cor-modal__close').click();
  await page.locator('[data-modal-layer]').waitFor({ state: 'hidden' });

  await page.evaluate(() => window.__COR_TEST__.completeRecommendedAction());
  await page.waitForTimeout(120);
  const corrected = await snapshot();
  if (corrected.spacingDefect || corrected.phase !== 'reinspeccion') failures.push('La corrección no restituyó la geometría antes de reinspeccionar.');

  await page.evaluate(() => window.__COR_TEST__.completeRecommendedAction());
  await page.waitForTimeout(140);
  const climateDecision = await snapshot();
  if (climateDecision.phase !== 'clima') failures.push('La reinspección no abrió la decisión meteorológica.');
  await page.evaluate(() => window.__COR_TEST__.setWeather('rain'));
  await page.locator('.cor-nav [data-hud-panel="weather"]').click();
  await page.locator('[data-hud-action="unsafe-weather"]').click();
  await page.waitForTimeout(320);
  const reprimand = await snapshot();
  if (reprimand.supervisor?.kind !== 'reprimand' || reprimand.supervisor?.ruleId !== 'RAIN_DURING_POUR') {
    failures.push(`El intento inseguro no activó la reprimenda técnica esperada: ${JSON.stringify(reprimand.supervisor)}.`);
  }
  await page.screenshot({ path: 'work/acceptance-supervisor-reprimand.png' });

  await page.evaluate(() => {
    for (let step = 0; step < 4; step += 1) window.__COR_TEST__.completeRecommendedAction();
  });
  await page.waitForTimeout(180);
  const completed = await snapshot();
  if (completed.missionStatus !== 'completed' || completed.phase !== 'debrief') failures.push('El flujo completo no cerró el dossier de calidad.');

  await page.keyboard.press('F10');
  await page.waitForTimeout(150);
  const hiddenHud = await snapshot();
  if (hiddenHud.hudVisible) failures.push('F10 no ocultó el HUD.');
  await page.keyboard.press('F10');

  await page.evaluate(() => window.__COR_TEST__.setWeather('rain'));
  await page.waitForTimeout(650);
  const rainy = await snapshot();
  if (rainy.weather !== 'rain') failures.push('El clima no cambió a lluvia.');
  await page.screenshot({ path: 'work/acceptance-rain.png' });
  await page.evaluate(() => window.__COR_TEST__.setWeather('sunny'));

  if (consoleErrors.length) failures.push(`Errores de consola: ${consoleErrors.join(' | ')}`);
  const report = { initial, moving, stopped, defective, tablet, corrected, climateDecision, reprimand, completed, hiddenHud, rainy, travel, consoleErrors, failures };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exitCode = 2;
} finally {
  await browser.close();
}
