import { access, mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright-core';
import { createServer as createViteServer } from 'vite';

import { PHASES, STORAGE_KEY } from '../src/gameState.js';
import { runStateAcceptance } from './state-machine-test.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = path.join(projectRoot, 'work', 'qa-phases');
const suppliedUrl = process.argv.slice(2).find((argument) => /^https?:\/\//i.test(argument));
const startedAt = new Date().toISOString();

const report = {
  suite: 'Cimentaciones: Obra Real — aceptación integral de fases',
  startedAt,
  url: null,
  stateMachine: null,
  runtime: {},
  phases: [],
  weather: [],
  screenshots: [],
  checks: [],
  failures: [],
  warnings: [],
  consoleErrors: [],
  requestFailures: [],
};

function record(id, passed, message, details = undefined) {
  const item = { id, passed: Boolean(passed), message };
  if (details !== undefined) item.details = details;
  report.checks.push(item);
  if (!passed) report.failures.push({ id, message, details });
  return passed;
}

function warning(id, message, details = undefined) {
  report.warnings.push({ id, message, details });
}

async function step(id, callback) {
  try {
    return await callback();
  } catch (error) {
    record(id, false, `Excepción durante ${id}`, error?.stack || error?.message || String(error));
    return null;
  }
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function edgeExecutable() {
  const candidates = [
    process.env.EDGE_PATH,
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue with the next standard installation path.
    }
  }
  throw new Error('Microsoft Edge no está instalado en una ruta conocida. Define EDGE_PATH para ejecutar QA.');
}

async function imageSample(buffer) {
  try {
    const { default: sharp } = await import('sharp');
    const image = sharp(buffer);
    const [metadata, stats, pixels] = await Promise.all([
      image.metadata(),
      image.stats(),
      image.clone().resize(48, 27, { fit: 'fill' }).removeAlpha().raw().toBuffer(),
    ]);
    return {
      width: metadata.width,
      height: metadata.height,
      entropy: Number(stats.entropy.toFixed(3)),
      channels: stats.channels.slice(0, 3).map((channel) => Number(channel.mean.toFixed(2))),
      pixels,
    };
  } catch (error) {
    warning('IMAGE_ANALYSIS_UNAVAILABLE', 'No se pudo analizar estadísticamente una captura.', error.message);
    return null;
  }
}

function imageDifference(first, second) {
  if (!first?.pixels || !second?.pixels || first.pixels.length !== second.pixels.length) return null;
  let total = 0;
  for (let index = 0; index < first.pixels.length; index += 1) total += Math.abs(first.pixels[index] - second.pixels[index]);
  return total / first.pixels.length;
}

async function run() {
  await mkdir(artifactRoot, { recursive: true });

  await step('STATE_MACHINE', async () => {
    report.stateMachine = runStateAcceptance();
    record('STATE_ALL_PHASES', report.stateMachine.ok, 'La máquina de estados recorre las diez fases.');
  });

  let vite = null;
  let browser = null;
  try {
    let baseUrl = suppliedUrl;
    if (!baseUrl) {
      const port = await freePort();
      vite = await createViteServer({
        root: projectRoot,
        logLevel: 'error',
        server: { host: '127.0.0.1', port, strictPort: true },
      });
      await vite.listen();
      baseUrl = `http://127.0.0.1:${port}/`;
    }
    const gameUrl = new URL(baseUrl);
    gameUrl.searchParams.set('autostart', '1');
    gameUrl.searchParams.set('qa', Date.now().toString(36));
    report.url = gameUrl.href;

    browser = await chromium.launch({
      executablePath: await edgeExecutable(),
      headless: true,
      args: [
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--enable-unsafe-swiftshader',
        '--no-first-run',
        '--disable-background-timer-throttling',
      ],
    });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
      locale: 'es-ES',
    });
    await context.addInitScript((storageKey) => {
      try { localStorage.removeItem(storageKey); } catch { /* origin not ready */ }
    }, STORAGE_KEY);
    const page = await context.newPage();
    page.on('pageerror', (error) => report.consoleErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') report.consoleErrors.push(`console: ${message.text()}`);
    });
    page.on('requestfailed', (request) => {
      const failure = request.failure();
      if (!/ERR_ABORTED/i.test(failure?.errorText || '')) {
        report.requestFailures.push(`${failure?.errorText || 'requestfailed'} · ${request.url()}`);
      }
    });
    page.on('response', (response) => {
      if (response.status() >= 400) report.requestFailures.push(`HTTP ${response.status()} · ${response.url()}`);
    });

    await page.goto(gameUrl.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.locator('body[data-ready="true"]').waitFor({ state: 'visible', timeout: 180_000 });
    await page.waitForFunction(() => window.__COR_TEST__?.ready === true, null, { timeout: 30_000 });
    await page.waitForTimeout(1_200);

    const hookContract = await page.evaluate(() => {
      const hook = window.__COR_TEST__;
      return {
        exists: Boolean(hook),
        ready: hook?.ready,
        snapshot: typeof hook?.snapshot,
        setWeather: typeof hook?.setWeather,
        completeRecommendedAction: typeof hook?.completeRecommendedAction,
        player: Boolean(hook?.player),
        site: Boolean(hook?.site),
        hud: Boolean(hook?.hud),
      };
    });
    record(
      'HOOK_CONTRACT',
      hookContract.exists && hookContract.ready && hookContract.snapshot === 'function'
        && hookContract.setWeather === 'function' && hookContract.completeRecommendedAction === 'function'
        && hookContract.player && hookContract.site && hookContract.hud,
      'El hook __COR_TEST__ expone el contrato necesario para QA externa.',
      hookContract,
    );

    const snapshot = () => page.evaluate(() => window.__COR_TEST__.snapshot());
    const capture = async (name, fullPage = false) => {
      const target = path.join(artifactRoot, `${name}.png`);
      const buffer = await page.screenshot({ path: target, fullPage, animations: 'disabled' });
      const sample = await imageSample(buffer);
      const entry = { name, path: path.relative(projectRoot, target).replaceAll('\\', '/'), bytes: buffer.length };
      if (sample) entry.image = { width: sample.width, height: sample.height, entropy: sample.entropy, channels: sample.channels };
      report.screenshots.push(entry);
      record(`CAPTURE_${name.toUpperCase().replaceAll('-', '_')}`, buffer.length > 50_000, `La captura ${name} contiene una imagen renderizada.`, entry);
      if (sample) record(`IMAGE_${name.toUpperCase().replaceAll('-', '_')}`, sample.entropy > 2.2, `La captura ${name} no es un fotograma vacío.`, entry.image);
      return sample;
    };

    const initial = await snapshot();
    report.runtime.initial = initial;
    record('INITIAL_PHASE', initial?.phase === 'briefing', 'La sesión empieza en briefing.', initial);
    record('SCENE_DENSITY', initial?.obstacles >= 8 && initial?.interactions >= 3, 'La escena contiene colisiones e interacciones suficientes.', initial);
    record('REBAR_READY', initial?.rebar?.lowerBarCount >= 100, 'La armadura técnica está inicializada.', initial?.rebar);
    record('AVATAR_HEIGHT', initial?.bounds?.sizeY >= 1.55 && initial?.bounds?.sizeY <= 2.15, 'El avatar conserva una escala humana plausible.', initial?.bounds);
    record('AVATAR_GROUNDED', Math.abs(initial?.footDelta ?? 99) <= 0.06, 'Los pies del avatar coinciden con la rasante.', { footDelta: initial?.footDelta });
    await capture('00-briefing-inicial');

    await step('ACCESSIBILITY_BASE', async () => {
      const audit = await page.evaluate(() => {
        const visible = (node) => {
          const style = getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        };
        const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
        const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
        const unnamedButtons = [...document.querySelectorAll('button')]
          .filter(visible)
          .filter((button) => !(button.getAttribute('aria-label') || button.textContent.trim()))
          .map((button) => button.outerHTML.slice(0, 160));
        const invalidProgress = [...document.querySelectorAll('[role="progressbar"]')]
          .filter(visible)
          .filter((item) => !item.hasAttribute('aria-valuemin') || !item.hasAttribute('aria-valuemax') || !item.hasAttribute('aria-valuenow'))
          .map((item) => item.outerHTML.slice(0, 160));
        const text = document.body.innerText;
        return {
          lang: document.documentElement.lang,
          mainCount: document.querySelectorAll('main').length,
          canvasLabel: document.querySelector('canvas')?.getAttribute('aria-label'),
          duplicates,
          unnamedButtons,
          invalidProgress,
          mojibake: [...new Set(text.match(/(?:Ã.|Â.|â€.|â‚¬|âˆ’)/g) || [])],
          horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
        };
      });
      report.runtime.accessibility = audit;
      record('A11Y_LANGUAGE', audit.lang === 'es', 'El documento declara español.', audit.lang);
      record('A11Y_MAIN', audit.mainCount === 1, 'Existe un único landmark principal.', audit.mainCount);
      record('A11Y_CANVAS_NAME', Boolean(audit.canvasLabel), 'El lienzo 3D tiene nombre accesible.', audit.canvasLabel);
      record('A11Y_DUPLICATE_IDS', audit.duplicates.length === 0, 'No hay identificadores DOM duplicados.', audit.duplicates);
      record('A11Y_BUTTON_NAMES', audit.unnamedButtons.length === 0, 'Todos los botones visibles tienen nombre accesible.', audit.unnamedButtons);
      record('A11Y_PROGRESS', audit.invalidProgress.length === 0, 'Las barras de progreso exponen valores ARIA completos.', audit.invalidProgress);
      record('A11Y_ENCODING', audit.mojibake.length === 0, 'La interfaz no contiene texto español con codificación rota.', audit.mojibake);
      record('LAYOUT_NO_PAGE_OVERFLOW', audit.horizontalOverflow <= 1, 'La vista no provoca desplazamiento horizontal.', audit.horizontalOverflow);
    });

    await step('LOCOMOTION', async () => {
      const before = await snapshot();
      await page.keyboard.down('w');
      await page.waitForTimeout(950);
      const walking = await snapshot();
      await page.keyboard.down('Shift');
      await page.waitForTimeout(700);
      const running = await snapshot();
      await page.keyboard.up('Shift');
      await page.keyboard.up('w');
      await page.waitForTimeout(500);
      const stopped = await snapshot();
      const walkDistance = Math.hypot(walking.player.x - before.player.x, walking.player.z - before.player.z);
      const runDistance = Math.hypot(running.player.x - walking.player.x, running.player.z - walking.player.z);
      record('MOVE_WALK', walkDistance >= 0.45, 'W desplaza al jugador con animación de marcha.', { walkDistance, animation: walking.animation });
      record('MOVE_RUN', runDistance >= 0.65 && running.animation === 'run', 'Mayús + W activa carrera y mayor desplazamiento.', { runDistance, animation: running.animation });
      record('MOVE_IDLE', stopped.animation === 'idle', 'Al soltar controles el avatar vuelve a reposo.', { animation: stopped.animation });
      record('MOVE_GROUNDING', Math.abs(stopped.footDelta) <= 0.06, 'La locomoción mantiene los pies sobre el terreno.', { footDelta: stopped.footDelta });
      report.runtime.locomotion = { before, walking, running, stopped, walkDistance, runDistance };
    });

    await step('COLLISIONS', async () => {
      const collision = await page.evaluate(() => {
        const hook = window.__COR_TEST__;
        const player = hook.player;
        const site = hook.site;
        const original = player.group.position.clone();
        const originalRotation = player.group.rotation.y;
        const obstacle = site.obstacles.find((item) => Number.isFinite(item.x) && Number.isFinite(item.z)
          && item.radius >= 0.45 && item.radius <= 4.6 && Math.abs(item.x) < 27 && Math.abs(item.z) < 20);
        if (!obstacle) return { available: false };
        const minimum = player.radius + obstacle.radius;
        player.velocity.set(0, 0, 0);
        player.group.position.set(obstacle.x + minimum + 0.04, site.getHeightAt(obstacle.x + minimum + 0.04, obstacle.z), obstacle.z);
        for (let index = 0; index < 100; index += 1) {
          player.update(0.025, { forward: true }, -Math.PI / 2, site.obstacles);
        }
        const distance = Math.hypot(player.group.position.x - obstacle.x, player.group.position.z - obstacle.z);
        const obstacleResult = { distance, minimum, penetration: minimum - distance };

        player.velocity.set(0, 0, 0);
        player.group.position.set(33.45, site.getHeightAt(33.45, 0), 0);
        for (let index = 0; index < 80; index += 1) {
          player.update(0.025, { forward: true }, Math.PI / 2, site.obstacles);
        }
        const boundaryX = player.group.position.x;
        player.velocity.set(0, 0, 0);
        player.group.position.copy(original);
        player.group.rotation.y = originalRotation;
        return { available: true, obstacle: obstacleResult, boundaryX };
      });
      record('COLLISION_PROXY_AVAILABLE', collision.available, 'Existe al menos un obstáculo válido para ensayo.', collision);
      if (collision.available) {
        record('COLLISION_SOLID', collision.obstacle.penetration <= 0.006, 'El jugador no atraviesa la colisión de maquinaria/acopio.', collision.obstacle);
        record('COLLISION_BOUNDARY', collision.boundaryX <= 33.501, 'El jugador no abandona los límites de la obra.', collision.boundaryX);
      }
      report.runtime.collisions = collision;
    });

    await step('INTERACTION_BINDING', async () => {
      const placement = await page.evaluate(() => {
        const hook = window.__COR_TEST__;
        const target = hook.site.interactions.find((item) => item.userData?.interaction?.panel === 'tablet')
          ?? hook.site.interactions.find((item) => item.userData?.interaction);
        if (!target) return { found: false };
        const world = target.getWorldPosition(target.position.clone());
        hook.player.group.position.set(world.x, hook.site.getHeightAt(world.x, world.z), world.z);
        hook.player.velocity.set(0, 0, 0);
        return { found: true, interaction: target.userData.interaction };
      });
      await page.waitForTimeout(250);
      const prompt = await page.locator('[data-interaction]').evaluate((node) => ({ hidden: node.hidden, text: node.innerText }));
      record('INTERACTION_POINT', placement.found && !prompt.hidden, 'El punto de interacción muestra una indicación contextual.', { placement, prompt });
      await page.keyboard.press('f');
      await page.waitForTimeout(180);
      const afterF = await snapshot();
      record('CONTROL_F_INTERACT', Boolean(afterF.activePanel), 'La tecla F anunciada en el panel de controles ejecuta la interacción.', afterF.activePanel);
      if (afterF.activePanel) await page.keyboard.press('Escape');
      await page.keyboard.press('e');
      await page.waitForTimeout(180);
      const afterE = await snapshot();
      record('CONTROL_CONTEXT_KEY', Boolean(afterE.activePanel), 'La tecla contextual mostrada junto al objeto ejecuta la interacción.', { prompt: prompt.text, activePanel: afterE.activePanel });
      if (afterE.activePanel) await page.keyboard.press('Escape');
      await page.evaluate(() => {
        const hook = window.__COR_TEST__;
        hook.player.velocity.set(0, 0, 0);
        hook.player.group.position.set(10.8, hook.site.getHeightAt(10.8, 14.4), 14.4);
      });
    });

    await step('HUD_AND_MODAL', async () => {
      await page.keyboard.press('F10');
      await page.waitForTimeout(150);
      const hidden = await snapshot();
      const hiddenDom = await page.locator('.cor-hud').evaluate((node) => ({ hiddenClass: node.classList.contains('is-hidden'), visible: node.dataset.visible }));
      record('HUD_HIDE_F10', hidden.hudVisible === false && hiddenDom.hiddenClass, 'F10 oculta completamente el HUD.', { hidden, hiddenDom });
      await page.keyboard.press('F10');
      await page.waitForTimeout(150);
      record('HUD_SHOW_F10', (await snapshot()).hudVisible === true, 'F10 restaura el HUD.');

      await page.keyboard.press('t');
      await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
      await page.waitForFunction(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return Boolean(dialog?.contains(document.activeElement));
      }, null, { timeout: 2_000 }).catch(() => {});
      const modal = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]');
        return {
          panel: window.__COR_TEST__.snapshot().activePanel,
          ariaModal: dialog?.getAttribute('aria-modal'),
          labelledBy: dialog?.getAttribute('aria-labelledby'),
          focusInside: Boolean(dialog?.contains(document.activeElement)),
        };
      });
      record('TABLET_KEY', modal.panel === 'tablet', 'T abre la tablet.', modal);
      record('MODAL_SEMANTICS', modal.ariaModal === 'true' && Boolean(modal.labelledBy), 'La tablet usa semántica de diálogo modal.', modal);
      record('MODAL_FOCUS_ENTRY', modal.focusInside, 'Al abrir un panel el foco entra en el diálogo.', modal);
      for (let index = 0; index < 5; index += 1) await page.keyboard.press('Tab');
      const trapped = await page.evaluate(() => document.querySelector('[role="dialog"]')?.contains(document.activeElement));
      record('MODAL_FOCUS_TRAP', trapped, 'El tabulador no escapa del panel modal.');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
      record('MODAL_ESCAPE', (await snapshot()).activePanel === null, 'Escape cierra el panel modal.');

      await page.emulateMedia({ reducedMotion: 'reduce' });
      const motion = await page.evaluate(() => ({
        matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        grainAnimation: getComputedStyle(document.querySelector('.cor-grain')).animationName,
      }));
      record('A11Y_REDUCED_MOTION', motion.matches && motion.grainAnimation === 'none', 'La preferencia de movimiento reducido desactiva el grano animado.', motion);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
    });

    await step('RESPONSIVE_LAYOUT', async () => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await page.waitForTimeout(180);
      const layout = await page.evaluate(() => {
        const selectors = ['.cor-profile', '.cor-weather', '.cor-nav', '.cor-task', '.cor-right-stack', '.cor-bottom-left', '.cor-hotbar', '.cor-controls'];
        const boxes = selectors.map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          if (style.display === 'none' || style.visibility === 'hidden' || rect.width === 0 || rect.height === 0) return null;
          return { selector, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        }).filter(Boolean);
        const overlaps = [];
        for (let a = 0; a < boxes.length; a += 1) {
          for (let b = a + 1; b < boxes.length; b += 1) {
            const x = Math.max(0, Math.min(boxes[a].right, boxes[b].right) - Math.max(boxes[a].left, boxes[b].left));
            const y = Math.max(0, Math.min(boxes[a].bottom, boxes[b].bottom) - Math.max(boxes[a].top, boxes[b].top));
            const area = x * y;
            const smaller = Math.min(boxes[a].width * boxes[a].height, boxes[b].width * boxes[b].height);
            if (area > 20 && area / smaller > 0.025) overlaps.push({ a: boxes[a].selector, b: boxes[b].selector, ratio: area / smaller });
          }
        }
        return {
          boxes,
          overlaps,
          overflowX: document.documentElement.scrollWidth - innerWidth,
          overflowY: document.documentElement.scrollHeight - innerHeight,
        };
      });
      record('RESPONSIVE_OVERLAP_1366', layout.overlaps.length === 0, 'Los módulos HUD no se solapan a 1366 × 768.', layout.overlaps);
      record('RESPONSIVE_OVERFLOW_1366', layout.overflowX <= 1 && layout.overflowY <= 1, 'El HUD cabe sin scroll a 1366 × 768.', layout);
      await capture('layout-1366x768');
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.waitForTimeout(220);
      report.runtime.layout1366 = layout;
    });

    await step('PHASE_WALKTHROUGH', async () => {
      for (let index = 0; index < PHASES.length; index += 1) {
        const expected = PHASES[index];
        const state = await snapshot();
        const presentation = await page.evaluate(async () => {
          const definitions = (await import('/src/gameState.js')).PHASE_DEFINITIONS;
          const hook = window.__COR_TEST__;
          const snapshot = hook.snapshot();
          return {
            phase: snapshot.phase,
            expectedTitle: definitions[snapshot.phase]?.label,
            objectiveTitle: document.querySelector('[data-objective-title]')?.textContent?.trim(),
            taskTitle: document.querySelector('[data-task-title]')?.textContent?.trim(),
            terrainPhase: hook.site.terrain?.concretePhase,
            rebarStage: hook.site.rebar?.stage,
            defect: snapshot.spacingDefect,
            hudVisible: snapshot.hudVisible,
          };
        });
        record(`PHASE_${expected.toUpperCase()}`, state.phase === expected, `La fase ${expected} aparece en el orden previsto.`, { state, presentation });
        record(`PHASE_UI_${expected.toUpperCase()}`, presentation.objectiveTitle === presentation.expectedTitle && Boolean(presentation.taskTitle), `La interfaz describe la fase ${expected}.`, presentation);
        report.phases.push({ index, expected, state, presentation });
        await capture(`${String(index + 1).padStart(2, '0')}-fase-${expected}`);

        if (expected === 'correccion') {
          const persisted = await page.evaluate(async () => {
            const module = await import('/src/gameState.js');
            const result = module.loadGameResult();
            return result.ok ? {
              ok: true,
              phase: result.state.phase,
              incident: result.state.incidents[0]?.status,
              evidence: result.state.inspection.evidence.length,
            } : result;
          });
          record('BROWSER_SAVE_LOAD', persisted.ok && persisted.phase === 'correccion' && persisted.incident === 'open', 'El guardado real del navegador conserva fase, incidencia y evidencia.', persisted);
        }

        if (expected === 'inspeccion') {
          await page.keyboard.press('t');
          await page.locator('[data-hud-action="scan"]').click();
          await page.waitForTimeout(260);
          const scanned = await snapshot();
          record('INCIDENT_DETECTED', scanned.phase === 'correccion' && scanned.spacingDefect, 'El escaneo detecta y representa la separación incorrecta.', scanned);
          record('INSPECTION_AR_OVERLAY', scanned.inspectionOverlay, 'La tablet resalta visualmente la barra no conforme.', scanned);
          await capture('tablet-incidencia-ra');
          await page.keyboard.press('Escape');
        } else if (expected !== 'debrief') {
          await page.evaluate(() => window.__COR_TEST__.completeRecommendedAction());
          await page.waitForTimeout(170);
        }
      }
      await page.evaluate(() => window.__COR_TEST__.completeRecommendedAction());
      await page.waitForTimeout(180);
      const completed = await snapshot();
      record('MISSION_COMPLETED', completed.phase === 'debrief' && completed.missionStatus === 'completed', 'El dossier final cierra la misión.', completed);
      report.runtime.completed = completed;

      const correction = report.phases.find((item) => item.expected === 'correccion')?.state;
      const reinspection = report.phases.find((item) => item.expected === 'reinspeccion')?.state;
      record('INCIDENT_VISUAL_CORRECTION', correction?.spacingDefect === true && reinspection?.spacingDefect === false, 'La barra desplazada desaparece al corregir antes de reinspeccionar.', { correction, reinspection });
      const curing = report.phases.find((item) => item.expected === 'curado')?.presentation;
      const debrief = report.phases.find((item) => item.expected === 'debrief')?.presentation;
      record('PHASE_VISUAL_CONCRETE', ['foundation', 'both'].includes(curing?.terrainPhase) && ['foundation', 'both'].includes(debrief?.terrainPhase), 'Vertido, curado y cierre muestran el hormigón ejecutado, no solo la capa de limpieza.', { curing, debrief });
    });

    await step('WEATHER_MODES', async () => {
      const samples = new Map();
      for (const mode of ['sunny', 'overcast', 'rain', 'night']) {
        await page.evaluate((nextMode) => window.__COR_TEST__.setWeather(nextMode), mode);
        await page.waitForTimeout(mode === 'rain' ? 700 : 450);
        const state = await snapshot();
        const visual = await page.evaluate(() => {
          const hook = window.__COR_TEST__;
          return {
            weather: hook.snapshot().weather,
            groundRoughness: hook.site.terrain.materials?.ground?.roughness,
            groundClearcoat: hook.site.terrain.materials?.ground?.clearcoat,
            fps: Number(document.body.dataset.fps || 0),
          };
        });
        record(`WEATHER_${mode.toUpperCase()}`, state.weather === mode, `El modo meteorológico ${mode} queda activo.`, { state, visual });
        const sample = await capture(`clima-${mode}`);
        samples.set(mode, sample);
        report.weather.push({ mode, state, visual });
      }
      const sunnyRain = imageDifference(samples.get('sunny'), samples.get('rain'));
      const sunnyNight = imageDifference(samples.get('sunny'), samples.get('night'));
      record('WEATHER_VISUAL_RAIN', sunnyRain === null || sunnyRain >= 2.0, 'La lluvia produce una diferencia visual medible frente al sol.', { meanAbsoluteDifference: sunnyRain });
      record('WEATHER_VISUAL_NIGHT', sunnyNight === null || sunnyNight >= 5.0, 'La noche produce una diferencia visual medible frente al día.', { meanAbsoluteDifference: sunnyNight });
      await page.evaluate(() => window.__COR_TEST__.setWeather('sunny'));
    });

    report.runtime.final = await snapshot();
    if ((report.runtime.final?.fps ?? 0) < 12) {
      warning('HEADLESS_FPS_LOW', 'El render por software de Edge quedó por debajo de 12 fps; medir rendimiento final con GPU real.', report.runtime.final?.fps);
    }
    record('NO_CONSOLE_ERRORS', report.consoleErrors.length === 0, 'No se registran excepciones ni errores de consola.', report.consoleErrors);
    record('NO_REQUEST_FAILURES', report.requestFailures.length === 0, 'Todos los activos solicitados responden correctamente.', report.requestFailures);
    await context.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (vite) await vite.close().catch(() => {});
  }
}

try {
  await run();
} catch (error) {
  record('SUITE_FATAL', false, 'La suite no pudo completar su inicialización.', error?.stack || error?.message || String(error));
} finally {
  report.finishedAt = new Date().toISOString();
  report.summary = {
    passed: report.checks.filter((check) => check.passed).length,
    failed: report.failures.length,
    warnings: report.warnings.length,
    phasesVisited: report.phases.map((phase) => phase.expected),
    screenshots: report.screenshots.length,
  };
  await mkdir(artifactRoot, { recursive: true });
  const reportPath = path.join(artifactRoot, 'phase-acceptance-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, (key, value) => key === 'pixels' ? undefined : value, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ report: path.relative(projectRoot, reportPath), summary: report.summary, failures: report.failures }, null, 2));
  if (report.failures.length) process.exitCode = 2;
}
