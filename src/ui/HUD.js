import './hud.css';
import { assetPath } from '../assets/assetPath.js';

import { ACTION_TYPES, getUIData } from '../gameState.js';
import { renderTrainingMission, TRAINING_MISSIONS } from './TrainingMissions.js';

const ICONS = Object.freeze({
  helmet: '<path d="M4 18h16"/><path d="M6 18v-3a6 6 0 0 1 12 0v3"/><path d="M9 15V8.5M15 15V8.5"/><path d="M3 18.2c2.5 1 5.5 1.5 9 1.5s6.5-.5 9-1.5"/>',
  sun: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .75-7.93A6 6 0 0 0 6.4 8.1 5 5 0 0 0 7 18Z"/><path d="M8 21l1-2M12 21l1-2M16 21l1-2"/>',
  journal: '<path d="M7 3h10v4H7z"/><path d="M5 5H3v16h18V5h-2M8 12h8M8 16h5"/><path d="M10 3V1h4v2"/>',
  plans: '<path d="M3 5.5C6 4 9 4.5 12 7v14c-3-2.5-6-3-9-1.5zM21 5.5C18 4 15 4.5 12 7v14c3-2.5 6-3 9-1.5z"/><path d="M7 9v6M17 9v6"/>',
  materials: '<path d="m4 7 8-4 8 4-8 4zM4 12l8 4 8-4M4 17l8 4 8-4"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20v-2a5.5 5.5 0 0 1 11 0v2M16 4.5a3 3 0 0 1 0 6M17 13a5 5 0 0 1 4 5v2"/>',
  machinery: '<path d="M3 15h15v4H3zM6 15V8h6l4 3v4M12 8V5h6l3 3"/><circle cx="7" cy="19" r="2"/><circle cx="16" cy="19" r="2"/>',
  weather: '<path d="M7 18h10a4 4 0 0 0 .8-7.9A6 6 0 0 0 6.5 8.2 5 5 0 0 0 7 18Z"/><path d="M8 21h8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1H9.5V21a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4 15a1.7 1.7 0 0 0-1.6-1H2v-4h.4A1.7 1.7 0 0 0 4 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.46 4.2l.06.06A1.7 1.7 0 0 0 8.4 4a1.7 1.7 0 0 0 1.1-1.6V2h4v.4A1.7 1.7 0 0 0 14.6 4a1.7 1.7 0 0 0 1.88.26l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19 9a1.7 1.7 0 0 0 1.6 1h.4v4h-.4a1.7 1.7 0 0 0-1.2 1Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>',
  shield: '<path d="M12 3 4.5 6v5.6c0 4.5 3.1 7.7 7.5 9.4 4.4-1.7 7.5-4.9 7.5-9.4V6z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  cubes: '<path d="m8 3 5 3-5 3-5-3zM8 9v6M3 6v6l5 3 5-3V6M16 9l5 3-5 3-5-3M16 15v6M11 12v6l5 3 5-3v-6"/>',
  euro: '<circle cx="12" cy="12" r="9"/><path d="M16 8.2a5 5 0 1 0 0 7.6M6.5 10.2h7M6.5 13.8h7"/>',
  risk: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17.5v.1"/>',
  cursor: '<path d="m5 3 14 9-6.2 1.2L10 19z"/>',
  tablet: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M9 5h6M11 18.5h2"/>',
  measure: '<path d="m4 17 13-13 3 3-13 13z"/><path d="m10 11 2 2M13 8l2 2M7 14l2 2"/>',
  inspect: '<path d="M4 4h6M4 4v6M20 4h-6M20 4v6M4 20h6M4 20v-6M20 20h-6M20 20v-6"/><circle cx="12" cy="12" r="3"/>',
  camera: '<path d="M4 7h4l1.5-2h5L16 7h4v12H4z"/><circle cx="12" cy="13" r="3.5"/>',
  radio: '<rect x="6" y="7" width="12" height="14" rx="2"/><path d="m9 7 5-5M9 11h6M9 15h2M14 15h1M14 18h1M9 18h2"/>',
  alert: '<path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17.5v.1"/>',
  keys: '<rect x="3" y="6" width="7" height="7" rx="1"/><rect x="14" y="6" width="7" height="7" rx="1"/><path d="M8 17h8"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.1"/>',
});

function icon(name, className = '') {
  const paths = ICONS[name] || ICONS.info;
  return `<svg class="cor-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, safeNumber(value)));
}

function formatCurrency(value) {
  return `${safeNumber(value, 18450).toLocaleString('es-ES')} €`;
}

function resolveUI(source) {
  if (!source) return null;
  if (typeof source.getUIData === 'function') return source.getUIData();
  if (typeof source.getState === 'function') return getUIData(source.getState());
  if (source.objectiveTitle && source.profile) return source;
  if (source.phase && source.mission && source.profile) return getUIData(source);
  return null;
}

function makeEl(tag, className, text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function setText(root, selector, value) {
  const node = root.querySelector(selector);
  if (node) node.textContent = value ?? '';
}

function setProgress(root, selector, value) {
  const node = root.querySelector(selector);
  if (!node) return;
  const amount = clamp(value);
  node.style.setProperty('--progress', `${amount}%`);
  node.setAttribute('aria-valuenow', String(Math.round(amount)));
}

function createMarkup() {
  return `
    <section class="cor-hud" aria-label="Interfaz de Cimentaciones: Obra Real" data-visible="true">
      <div class="cor-hud__chrome" data-hud-chrome>
        <header class="cor-hud__top">
          <div class="cor-profile cor-panel" aria-label="Perfil del jugador">
            <div class="cor-profile__badge">${icon('helmet')}<span data-level>1</span></div>
            <div class="cor-profile__copy">
              <strong data-rank>AYUDANTE DE OBRA</strong>
              <div class="cor-profile__meta"><span>NIVEL <b data-level-copy>1</b></span><span><b data-xp-current>520</b> / <b data-xp-next>600</b> XP</span></div>
              <div class="cor-progress cor-progress--xp" role="progressbar" aria-label="Progreso de experiencia" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-xp-progress><i></i></div>
            </div>
          </div>

          <div class="cor-weather cor-panel">
            <span class="cor-weather__icon" data-weather-icon>${icon('sun')}</span>
            <div><strong data-time>08:30</strong><b data-weather>DESPEJADO 24 °C</b><small data-day>Martes · Jornada 07</small></div>
          </div>

          <nav class="cor-nav cor-panel" aria-label="Menú principal">
            <button type="button" data-hud-panel="journal" aria-label="Abrir diario">${icon('journal')}<span>Diario</span><i class="cor-nav__notice">3</i></button>
            <button type="button" data-hud-panel="plans" aria-label="Abrir planos">${icon('plans')}<span>Planos</span></button>
            <button type="button" data-hud-panel="materials" aria-label="Abrir materiales">${icon('materials')}<span>Materiales</span></button>
            <button type="button" data-hud-panel="people" aria-label="Abrir personal">${icon('people')}<span>Personal</span></button>
            <button type="button" data-hud-panel="machinery" aria-label="Abrir maquinaria">${icon('machinery')}<span>Maquinaria</span></button>
            <button type="button" data-hud-panel="weather" aria-label="Abrir clima">${icon('weather')}<span>Clima</span></button>
            <button type="button" data-hud-panel="settings" aria-label="Abrir ajustes">${icon('settings')}<span>Ajustes</span></button>
          </nav>
        </header>

        <aside class="cor-task cor-panel" aria-labelledby="cor-task-title">
          <div class="cor-panel__kicker cor-panel__kicker--blue">${icon('journal')}<span>TAREA ACTUAL</span></div>
          <h2 id="cor-task-title" data-task-title>Revisar punto de parada Z-04</h2>
          <ol class="cor-task__list" data-task-list></ol>
          <button class="cor-text-button" type="button" data-hud-panel="plans">VER PLANOS ${icon('plans')}</button>
        </aside>

        <div class="cor-right-stack">
          <aside class="cor-objective cor-panel" aria-labelledby="cor-objective-title">
            <div class="cor-panel__kicker cor-panel__kicker--yellow">${icon('target')}<span>OBJETIVO ACTUAL</span></div>
            <h2 id="cor-objective-title" data-objective-title>Cimentación · Área A</h2>
            <p data-objective-copy>Completa la ejecución conforme al proyecto.</p>
            <div class="cor-objective__progress-row">
              <div class="cor-progress" role="progressbar" aria-label="Progreso del objetivo" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-mission-progress><i></i></div>
              <strong data-progress-label>0%</strong>
            </div>
          </aside>

          <aside class="cor-safety cor-panel" aria-labelledby="cor-safety-title">
            <div class="cor-safety__head"><h2 id="cor-safety-title">SEGURIDAD</h2><span class="cor-status-label cor-status-label--ok">CONTROLADA</span></div>
            <div class="cor-safety__score"><span>Índice de seguridad</span><strong data-safety-score>100%</strong></div>
            <ul data-safety-list>
              <li><span>Casco y chaleco</span><b>${icon('check')}<em>Correcto</em></b></li>
              <li><span>Protección colectiva</span><b>${icon('check')}<em>Correcto</em></b></li>
              <li><span>Zona señalizada</span><b>${icon('check')}<em>Correcto</em></b></li>
              <li><span>Orden del tajo</span><b>${icon('check')}<em>Correcto</em></b></li>
            </ul>
            <button class="cor-outline-button" type="button" data-hud-panel="mission">ABRIR MISIÓN ACTIVA</button>
          </aside>
        </div>

        <section class="cor-bottom-left" aria-label="Navegación y recursos">
          <div class="cor-minimap cor-panel" aria-label="Minimapa de la obra">
            <svg class="cor-minimap__drawing" viewBox="0 0 200 200" role="img" aria-label="Plano esquemático del área de cimentación">
              <defs><filter id="map-soft"><feGaussianBlur stdDeviation=".35"/></filter></defs>
              <g class="cor-minimap__roads" filter="url(#map-soft)"><path d="M-5 52 205 160M-6 114 162 202M37-3 205 83M81-7-4 151M154-5 61 205"/><path d="M-12 72 193 178M18-8l195 101"/></g>
              <g class="cor-minimap__site"><path d="M43 40h72v42H43zM72 97h76v54H72zM25 112h31v51H25zM132 26h42v49h-42z"/><path d="M82 107h56v34H82zM52 49h52v22H52z"/></g>
              <g class="cor-minimap__markers" data-map-markers>
                <circle class="cor-map-marker cor-map-marker--safe" cx="43" cy="83" r="5"/><circle class="cor-map-marker cor-map-marker--info" cx="147" cy="54" r="5"/><circle class="cor-map-marker cor-map-marker--warning" cx="130" cy="128" r="5"/>
              </g>
              <path class="cor-minimap__player" d="m100 92 9 22-9-4-9 4z"/>
            </svg>
            <span class="cor-minimap__north">N</span>
            <div class="cor-minimap__zoom" aria-hidden="true"><span>+</span><span>−</span></div>
            <strong data-zone>CIMENTACIÓN · Z-04</strong>
          </div>
          <div class="cor-resources cor-panel">
            <div>${icon('clock')}<span><small>TIEMPO</small><strong data-resource-time>08:30</strong><em data-resource-day>12/05/2026</em></span></div>
            <div>${icon('cubes')}<span><small>MATERIAL</small><strong data-material>78%</strong><em>Disponibilidad</em></span></div>
            <div>${icon('euro')}<span><small>PRESUPUESTO</small><strong data-budget>18.450 €</strong><em data-budget-status>En objetivo</em></span></div>
            <div>${icon('risk')}<span><small>RIESGO</small><strong data-risk>BAJO</strong><em data-risk-copy>Controlado</em></span></div>
          </div>
        </section>

        <div class="cor-hotbar cor-panel" role="toolbar" aria-label="Herramientas rápidas">
          <button type="button" data-tool="select" class="is-active"><kbd>1</kbd>${icon('cursor')}<span>Seleccionar</span></button>
          <button type="button" data-hud-panel="mission"><kbd>2</kbd>${icon('journal')}<span>Misiones</span></button>
          <button type="button" data-hud-panel="plans"><kbd>3</kbd>${icon('plans')}<span>Planos</span></button>
          <button type="button" data-tool="measure"><kbd>4</kbd>${icon('measure')}<span>Medir</span></button>
          <button type="button" data-hud-panel="mission"><kbd>5</kbd>${icon('inspect')}<span>Simular</span></button>
          <button type="button" data-tool="camera"><kbd>6</kbd>${icon('camera')}<span>Evidencia</span></button>
          <button type="button" data-tool="radio"><kbd>7</kbd>${icon('radio')}<span>Radio</span></button>
          <button type="button" data-hud-panel="journal"><kbd>8</kbd>${icon('alert')}<span>Incidencias</span></button>
        </div>

        <aside class="cor-controls cor-panel" aria-label="Controles">
          <h2>CONTROLES</h2>
          <dl>
            <div><dt><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></dt><dd>Mover</dd></div>
            <div><dt><span class="cor-mouse-icon"></span></dt><dd>Rotar cámara</dd></div>
            <div><dt><kbd>F</kbd></dt><dd>Interactuar</dd></div>
            <div><dt><kbd>R</kbd></dt><dd>Misión activa</dd></div>
            <div><dt><kbd>M</kbd></dt><dd>Mapa</dd></div>
            <div><dt><kbd>F10</kbd></dt><dd>Ocultar HUD</dd></div>
          </dl>
        </aside>

        <div class="cor-live-region" aria-live="polite" aria-atomic="true" data-live-region></div>
      </div>

      <button class="cor-hud__reveal" type="button" data-hud-reveal aria-label="Mostrar interfaz">${icon('eye')}<span>Mostrar HUD</span><kbd>F10</kbd></button>

      <div class="cor-modal-layer" data-modal-layer hidden>
        <div class="cor-modal-backdrop" data-modal-close></div>
        <section class="cor-modal" role="dialog" aria-modal="true" aria-labelledby="cor-modal-title" data-modal>
          <header class="cor-modal__header">
            <div><span class="cor-modal__eyebrow" data-modal-eyebrow>GEMELO DIGITAL · OR-27</span><h2 id="cor-modal-title" data-modal-title>Panel</h2></div>
            <button type="button" class="cor-modal__close" data-modal-close aria-label="Cerrar panel">${icon('close')}</button>
          </header>
          <div class="cor-modal__body" data-modal-body></div>
        </section>
      </div>
    </section>`;
}

function renderChecklist(host, items = []) {
  host.replaceChildren();
  const visible = items.slice(0, 4);
  visible.forEach((item) => {
    const li = makeEl('li', item.done ? 'is-done' : item.warning ? 'is-warning' : 'is-pending');
    const state = makeEl('span', 'cor-task__check');
    state.innerHTML = item.done ? icon('check') : item.warning ? icon('alert') : '';
    state.setAttribute('aria-hidden', 'true');
    const label = makeEl('span', '', item.label);
    const status = makeEl('strong', '', item.done ? 'Completado' : item.warning ? 'Requiere corrección' : 'Pendiente');
    li.append(state, label, status);
    host.append(li);
  });
}

function getModalContent(panel, ui, trainingAnswers = {}) {
  const progress = Math.round(clamp(ui?.progress));
  const checks = ui?.checklist || [];
  const verified = checks.filter((item) => item.done).length;
  const documents = [
    ['C-101', 'Plano de cimentación', 'REV. 03', 'VIGENTE'],
    ['EG-01', 'Estudio geotécnico', 'REV. 02', 'VIGENTE'],
    ['PC-01', 'Plan de control', 'REV. 02', 'VIGENTE'],
  ];

  if (panel === 'plans') {
    return {
      eyebrow: 'PROYECTO FICTICIO OR-27 · DOCUMENTACIÓN',
      title: 'Planos y prescripciones',
      className: 'cor-modal--plans',
      html: `<div class="cor-blueprint">
        <div class="cor-blueprint__drawing" role="img" aria-label="Detalle técnico esquemático de la zapata Z-04">
          <svg viewBox="0 0 760 430" fill="none"><g class="grid"><path d="M0 43h760M0 86h760M0 129h760M0 172h760M0 215h760M0 258h760M0 301h760M0 344h760M0 387h760M76 0v430M152 0v430M228 0v430M304 0v430M380 0v430M456 0v430M532 0v430M608 0v430M684 0v430"/></g><g class="line"><path d="M128 94h504v244H128zM174 132h412v168H174zM230 170h300v92H230z"/><path d="M174 216h412M380 132v168M230 170l-56-38M530 262l56 38"/><circle cx="230" cy="170" r="9"/><circle cx="530" cy="262" r="9"/></g><g class="dimension"><path d="M128 366h504M128 350v32M632 350v32M99 94v244M84 94h31M84 338h31"/><text x="355" y="391">3 800 mm</text><text x="52" y="230" transform="rotate(-90 52 230)">3 200 mm</text><text x="303" y="208">Z-04 · B500S · Ø16/200</text></g></svg>
          <span class="cor-blueprint__stamp">CONTROLADO<br><b>REV. 03</b></span>
        </div>
        <aside class="cor-blueprint__data"><h3>DATOS DE PROYECTO</h3><dl><div><dt>Elemento</dt><dd>Zapata Z-04 · 3,80 × 3,20 m</dd></div><div><dt>Acero</dt><dd>B500S trazable</dd></div><div><dt>Recubrimiento</dt><dd>75 mm</dd></div><div><dt>Armadura inferior</dt><dd>Ø16 / 200 mm · X/Y</dd></div><div><dt>Solapes</dt><dd>Según detalle D-101 y cálculo</dd></div></dl><p>${icon('info')} Valores del proyecto ficticio OR-27. No son prescripciones universales.</p></aside>
      </div><div class="cor-document-list">${documents.map(([id, name, rev, status]) => `<div><span>${icon('plans')}</span><strong>${id}<small>${name}</small></strong><em>${rev}</em><b>${status}</b><button type="button" data-document="${id}" aria-label="Abrir ${name}">${icon('chevron')}</button></div>`).join('')}</div>`,
    };
  }

  if (panel === 'mission' || panel === 'tablet') {
    if (ui?.phase?.id === 'clima') return getModalContent('weather', ui, trainingAnswers);
    return {
      eyebrow: 'SIMULADOR DE EJECUCIÓN · PROYECTO OR-27',
      title: 'Misión formativa activa',
      className: 'cor-modal--training',
      html: renderTrainingMission(ui?.phase?.id, trainingAnswers, ui),
    };
  }

  if (panel === 'weather') {
    const wet = ui?.risk === 'medio' || ui?.phase?.id === 'clima';
    return {
      eyebrow: 'PRODUCCIÓN · METEOROLOGÍA',
      title: 'Ventana de hormigonado',
      className: 'cor-modal--weather',
      html: `<div class="cor-forecast-head"><div class="cor-forecast-head__symbol">${icon(wet ? 'cloud' : 'sun')}</div><div><small>SITUACIÓN ACTUAL</small><strong>${ui?.weatherLabel || 'Despejado · 24 °C'}</strong><span>Viento 11 km/h · Humedad 62%</span></div><div class="cor-forecast-head__decision"><small>VENTANA RECOMENDADA</small><strong>14:30 — 17:15</strong><span class="cor-status-label cor-status-label--ok">CONTINUIDAD VIABLE</span></div></div>
      <div class="cor-forecast-hours">${[['08:30','sun','24°','0%'],['10:40','cloud','21°','70%'],['12:00','cloud','20°','85%'],['14:30','sun','21°','10%'],['16:00','sun','22°','5%']].map(([time, type, temp, rain], index) => `<div class="${index === 1 || index === 2 ? 'is-risk' : index === 3 ? 'is-selected' : ''}"><time>${time}</time>${icon(type)}<strong>${temp}</strong><span>Precip. ${rain}</span>${index === 3 ? '<b>VENTANA</b>' : ''}</div>`).join('')}</div>
      <div class="cor-decision-grid"><article><span>${icon('risk')}</span><div><small>RIESGO PROCEDIMENTAL</small><h3>${wet ? 'Reevaluación requerida' : 'Condiciones controladas'}</h3><p>Comprobar accesos, escorrentía, protección del tajo y continuidad del suministro antes de autorizar.</p></div></article><article><span>${icon('machinery')}</span><div><small>LOGÍSTICA</small><h3>Suministro reservado</h3><p>Planta confirmada · lote H-2407 · acceso este operativo.</p></div></article></div>
      <div class="cor-weather-actions"><button type="button" class="cor-danger-button" data-hud-action="unsafe-weather">${icon('alert')} MANTENER EL VERTIDO A LAS 11:00</button><button type="button" class="cor-primary-button" data-hud-action="safe-weather">${icon('check')} REPROGRAMAR Y PROTEGER EL TAJO</button></div>`,
    };
  }

  if (panel === 'settings') {
    return {
      eyebrow: 'ACCESIBILIDAD Y EXPERIENCIA',
      title: 'Ajustes de interfaz',
      className: 'cor-modal--settings',
      html: `<div class="cor-settings-grid"><section><h3>INTERFAZ</h3><label class="cor-setting"><span><strong>HUD en pantalla</strong><small>Oculta o muestra todos los paneles de juego.</small></span><button type="button" role="switch" aria-checked="true" data-setting="hud">ACTIVO</button></label><label class="cor-setting"><span><strong>Contraste reforzado</strong><small>Aumenta bordes y opacidad de los paneles.</small></span><button type="button" role="switch" aria-checked="false" data-setting="contrast">NORMAL</button></label><label class="cor-setting"><span><strong>Reducir movimiento</strong><small>Suprime transiciones y animaciones decorativas.</small></span><button type="button" role="switch" aria-checked="false" data-setting="motion">NO</button></label></section><section><h3>TAMAÑO DEL HUD</h3><div class="cor-scale-control"><button type="button" data-scale="compact">COMPACTO</button><button type="button" class="is-active" data-scale="standard">ESTÁNDAR</button><button type="button" data-scale="large">GRANDE</button></div><p class="cor-settings-note">${icon('info')} Los avisos incluyen icono, texto y forma; ninguna información crítica depende solo del color.</p></section></div>`,
    };
  }

  const titles = {
    journal: ['DIARIO DE OBRA', 'Registro de jornada'],
    materials: ['LOGÍSTICA', 'Materiales y suministros'],
    people: ['PLANIFICACIÓN', 'Personal y cuadrillas'],
    machinery: ['EQUIPOS AUTORIZADOS', 'Maquinaria de obra'],
  };
  const [eyebrow, title] = titles[panel] || ['OBRA REAL', 'Información del proyecto'];
  const cards = panel === 'people'
    ? [['Ferralla Norte', '3 oficiales · Disponible', '94%'], ['Encofrados Levante', '2 oficiales · Asignada', '89%'], ['Hormigonado Centro', '4 operarios · Reservada', '92%']]
    : panel === 'machinery'
      ? [['Excavadora compacta', 'Revisión diaria conforme', 'LISTA'], ['Dúmper articulado', 'Operador autorizado', 'LISTO'], ['Bomba de hormigón', 'Reserva 14:15', 'RESERVADA']]
      : panel === 'materials'
        ? [['Acero B500S', 'Trazabilidad verificada', '78%'], ['Separadores 75 mm', 'Lote S-084', '96%'], ['Hormigón de proyecto', 'Lote H-2407', '10,4 m³']]
        : [['Briefing y EPI', '08:05 · Registro firmado', 'CERRADO'], ['Punto de parada Z-04', `${verified} controles verificados`, `${progress}%`], ['Incidencias', ui?.inspection?.openIncident ? 'Una incidencia activa' : 'Sin incidencias abiertas', ui?.inspection?.openIncident ? 'ABIERTA' : 'CONTROLADAS']];
  const missionArtByPhase = {
    briefing: 'briefing', planos: 'planos', cuadrilla: 'briefing', inspeccion: 'inspeccion',
    correccion: 'inspeccion', reinspeccion: 'inspeccion', clima: 'clima', vertido: 'vertido',
    curado: 'cierre', debrief: 'cierre',
  };
  const phaseArt = missionArtByPhase[ui?.phase?.id] || 'briefing';
  const missionHero = panel === 'journal' ? `<section class="cor-mission-hero"><img src="${assetPath(`assets/ui/missions/${phaseArt}.jpg`)}" alt="Escena profesional de ${ui?.phase?.label || 'la misión de cimentación'}" loading="lazy"><div><small>MISIÓN ACTIVA · OR-27 / Z-04</small><h3>${ui?.objectiveTitle || ui?.phase?.label || 'Cimentación superficial'}</h3><p>${ui?.objective || ui?.objectiveCopy || 'Completa el control con evidencia trazable y libera el punto de parada.'}</p><span>${icon('shield')} REGLAS Y DIÁLOGOS TRAZABLES</span></div></section>` : '';
  const missionRoadmap = panel === 'journal' ? `<section class="cor-mission-roadmap"><header><span>CAMPAÑA PRÁCTICA</span><strong>De plano a cimentación</strong><small>10 misiones · ferralla, hormigón y calidad</small></header><div>${Object.entries(TRAINING_MISSIONS).map(([phaseId, mission], index) => {
    const currentIndex = Math.max(0, (ui?.mission?.phaseNumber ?? 1) - 1);
    const status = index < currentIndex ? 'is-complete' : index === currentIndex ? 'is-active' : 'is-locked';
    return `<article class="${status}"><b>${mission.code}</b><span><strong>${mission.title}</strong><small>${index < currentIndex ? 'COMPLETADA' : index === currentIndex ? 'ACTIVA' : 'BLOQUEADA'}</small></span><em>+${mission.reward} XP</em></article>`;
  }).join('')}</div></section>` : '';
  return {
    eyebrow,
    title,
    className: 'cor-modal--cards',
    html: `${missionHero}${missionRoadmap}<div class="cor-data-summary"><div><small>PAQUETE DE TRABAJO</small><strong>Z-04 · Cimentación superficial</strong><span>${ui?.phase?.label || 'Jornada en curso'}</span></div><div><small>PROGRESO</small><strong>${progress}%</strong><div class="cor-progress" style="--progress:${progress}%"><i></i></div></div></div><div class="cor-data-cards">${cards.map(([name, copy, value]) => `<article><span>${icon(panel === 'people' ? 'people' : panel === 'machinery' ? 'machinery' : panel === 'materials' ? 'materials' : 'journal')}</span><div><h3>${name}</h3><p>${copy}</p></div><strong>${value}</strong>${icon('chevron')}</article>`).join('')}</div>`,
  };
}

/**
 * Creates the production HUD without owning or replacing the Three.js scene.
 *
 * `gameState` can be a `createGameStore()` instance, a raw gameplay state, or
 * the value returned by `getUIData()`. The returned controller exposes
 * `update`, `openPanel`, `closePanel`, `setVisible`, `toggle` and `destroy`.
 */
export function createHUD(root, gameState) {
  if (!(root instanceof Element)) throw new TypeError('createHUD requiere un elemento raíz válido.');

  const mount = document.createElement('div');
  mount.className = 'cor-hud-mount';
  mount.innerHTML = createMarkup();
  root.append(mount);

  const hud = mount.querySelector('.cor-hud');
  const modalLayer = mount.querySelector('[data-modal-layer]');
  const modal = mount.querySelector('[data-modal]');
  const modalBody = mount.querySelector('[data-modal-body]');
  let source = gameState;
  let currentUI = resolveUI(source) || {};
  let activePanel = null;
  const trainingProgress = new Map();
  let lastFocus = null;
  let visible = currentUI?.ui?.hudVisible !== false;
  let unsubscribe = null;

  function dispatchUI(action) {
    if (typeof source?.dispatch === 'function') return source.dispatch(action);
    mount.dispatchEvent(new CustomEvent('cor:hud-dispatch', { bubbles: true, detail: action }));
    return null;
  }

  function announce(message) {
    const region = mount.querySelector('[data-live-region]');
    region.textContent = '';
    requestAnimationFrame(() => { region.textContent = message; });
  }

  function setVisible(nextVisible, options = {}) {
    visible = Boolean(nextVisible);
    hud.dataset.visible = String(visible);
    hud.classList.toggle('is-hidden', !visible);
    if (!visible && activePanel) closePanel({ restoreFocus: false });
    if (options.dispatch !== false) dispatchUI({ type: ACTION_TYPES.SET_HUD_VISIBILITY, visible });
    announce(visible ? 'Interfaz mostrada' : 'Interfaz oculta. Pulsa F10 para mostrarla.');
    return visible;
  }

  function toggle() {
    return setVisible(!visible);
  }

  function closePanel(options = {}) {
    if (!activePanel) return;
    modalLayer.hidden = true;
    modal.className = 'cor-modal';
    document.documentElement.classList.remove('cor-modal-open');
    const closedPanel = activePanel;
    activePanel = null;
    dispatchUI({ type: ACTION_TYPES.SET_ACTIVE_PANEL, panel: null });
    if (closedPanel === 'tablet') dispatchUI({ type: ACTION_TYPES.SET_TABLET_OPEN, open: false });
    if (options.restoreFocus !== false && lastFocus?.isConnected) lastFocus.focus();
  }

  function renderPanel(panelName) {
    const name = String(panelName || 'journal');
    const phase = currentUI?.phase?.id ?? 'briefing';
    const answers = Object.fromEntries(
      [...trainingProgress.entries()]
        .filter(([key]) => key.startsWith(`${phase}:`))
        .map(([key, value]) => [key.slice(phase.length + 1), value]),
    );
    const content = getModalContent(name, currentUI, answers);
    setText(modal, '[data-modal-eyebrow]', content.eyebrow);
    setText(modal, '[data-modal-title]', content.title);
    modalBody.innerHTML = content.html;
    modal.className = `cor-modal ${content.className}`;
    return { name, content };
  }

  function openPanel(panelName, trigger = document.activeElement) {
    const { name, content } = renderPanel(panelName);
    lastFocus = trigger instanceof HTMLElement ? trigger : null;
    activePanel = name;
    modalLayer.hidden = false;
    document.documentElement.classList.add('cor-modal-open');
    dispatchUI({ type: ACTION_TYPES.SET_ACTIVE_PANEL, panel: name });
    if (name === 'tablet') dispatchUI({ type: ACTION_TYPES.SET_TABLET_OPEN, open: true });
    requestAnimationFrame(() => modal.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])')?.focus());
    announce(`${content.title} abierto`);
  }

  function update(nextSource = source) {
    source = nextSource || source;
    const ui = resolveUI(source);
    if (!ui) return;
    currentUI = ui;
    const rankProgress = ui.profile?.rankProgress || {};
    const nextRank = rankProgress.next;
    const level = ui.level ?? ui.profile?.level ?? 1;
    const xp = ui.xp ?? ui.profile?.xp ?? 0;
    const nextXp = nextRank?.minXp ?? ui.nextRankXp ?? xp;
    const progress = Math.round(clamp(ui.progress ?? ui.mission?.progressPercent));
    const safety = Math.round(clamp(ui.safetyScore, 0, 100));
    const time = ui.time || ui.clock?.display || '08:30';
    const day = ui.clock?.dayLabel || 'Martes · Jornada 07';
    const weather = ui.weatherLabel || 'Despejado · 24 °C';
    const isWet = /lluvia|precipit|frente/i.test(weather) || ui.phase?.id === 'clima';

    setText(mount, '[data-level]', level);
    setText(mount, '[data-level-copy]', level);
    setText(mount, '[data-rank]', String(ui.rank || ui.profile?.rankLabel || 'Ayudante de obra').toUpperCase());
    setText(mount, '[data-xp-current]', xp.toLocaleString('es-ES'));
    setText(mount, '[data-xp-next]', nextXp.toLocaleString('es-ES'));
    setProgress(mount, '[data-xp-progress]', ui.xpProgress ?? rankProgress.percent);
    setText(mount, '[data-time]', time);
    setText(mount, '[data-resource-time]', time);
    setText(mount, '[data-day]', day);
    setText(mount, '[data-resource-day]', day.replace(/.*·\s*/, ''));
    setText(mount, '[data-weather]', String(weather).toUpperCase());
    const weatherIcon = mount.querySelector('[data-weather-icon]');
    if (weatherIcon) weatherIcon.innerHTML = icon(isWet ? 'cloud' : 'sun');

    setText(mount, '[data-task-title]', ui.phase?.instruction || ui.objectiveCopy || 'Completar el control del paquete Z-04');
    setText(mount, '[data-objective-title]', ui.objectiveTitle || ui.phase?.label || 'Cimentación · Área A');
    setText(mount, '[data-objective-copy]', ui.objective || ui.objectiveCopy || 'Completa la cimentación conforme al proyecto.');
    setProgress(mount, '[data-mission-progress]', progress);
    setText(mount, '[data-progress-label]', `${progress}%`);
    setText(mount, '[data-safety-score]', `${safety}%`);
    setText(mount, '[data-zone]', String(ui.minimap?.activeZone || ui.phase?.location || 'Cimentación · Z-04').toUpperCase());
    setText(mount, '[data-material]', `${Math.round(safeNumber(ui.material, 78))}%`);
    setText(mount, '[data-budget]', formatCurrency(ui.budget ?? ui.profile?.budget));
    setText(mount, '[data-risk]', String(ui.risk || 'bajo').toUpperCase());
    setText(mount, '[data-risk-copy]', ui.risk === 'alto' ? 'Intervención requerida' : ui.risk === 'medio' ? 'Reevaluar condiciones' : 'Controlado');
    setText(mount, '[data-budget-status]', safeNumber(ui.profile?.budgetDelta) < -5000 ? 'Vigilar desviación' : 'En objetivo');
    renderChecklist(mount.querySelector('[data-task-list]'), ui.checklist || []);

    hud.classList.toggle('has-risk', ui.risk === 'alto' || ui.risk === 'medio');
    if (ui.ui?.hudVisible !== undefined && ui.ui.hudVisible !== visible) setVisible(ui.ui.hudVisible, { dispatch: false });
    if (activePanel) renderPanel(activePanel);
  }

  function handleClick(event) {
    const close = event.target.closest('[data-modal-close]');
    if (close) return closePanel();
    const reveal = event.target.closest('[data-hud-reveal]');
    if (reveal) return setVisible(true);
    const trainingChoice = event.target.closest('[data-training-choice]');
    if (trainingChoice) {
      const key = `${trainingChoice.dataset.phase}:${trainingChoice.dataset.question}`;
      const answer = {
        choice: trainingChoice.dataset.choice,
        correct: trainingChoice.dataset.correct === 'true',
      };
      trainingProgress.set(key, answer);
      renderPanel(activePanel || 'mission');
      announce(answer.correct ? 'Decisión correcta registrada.' : 'Decisión incorrecta. Revisa la explicación y vuelve a intentarlo.');
      return;
    }
    const panelButton = event.target.closest('[data-hud-panel]');
    if (panelButton) return openPanel(panelButton.dataset.hudPanel, panelButton);
    const tool = event.target.closest('[data-tool]');
    if (tool) {
      mount.querySelectorAll('[data-tool]').forEach((item) => item.classList.remove('is-active'));
      tool.classList.add('is-active');
      announce(`Herramienta ${tool.textContent.trim()} seleccionada`);
      mount.dispatchEvent(new CustomEvent('cor:hud-tool', { bubbles: true, detail: { tool: tool.dataset.tool } }));
      return;
    }
    const setting = event.target.closest('[data-setting]');
    if (setting) {
      const enabled = setting.getAttribute('aria-checked') !== 'true';
      setting.setAttribute('aria-checked', String(enabled));
      if (setting.dataset.setting === 'hud') return setVisible(enabled);
      if (setting.dataset.setting === 'contrast') hud.classList.toggle('is-high-contrast', enabled);
      if (setting.dataset.setting === 'motion') hud.classList.toggle('is-reduced-motion', enabled);
      setting.textContent = enabled ? 'ACTIVO' : setting.dataset.setting === 'contrast' ? 'NORMAL' : 'NO';
      return;
    }
    const scale = event.target.closest('[data-scale]');
    if (scale) {
      modal.querySelectorAll('[data-scale]').forEach((item) => item.classList.toggle('is-active', item === scale));
      hud.dataset.scale = scale.dataset.scale;
      return;
    }
    const action = event.target.closest('[data-hud-action]');
    if (action) mount.dispatchEvent(new CustomEvent('cor:hud-action', { bubbles: true, detail: { action: action.dataset.hudAction } }));
  }

  function handleKeydown(event) {
    if (event.code === 'F10') {
      event.preventDefault();
      toggle();
      return;
    }
    if (event.code === 'Escape' && activePanel) {
      event.preventDefault();
      closePanel();
      return;
    }
    if (activePanel && event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }

  mount.addEventListener('click', handleClick);
  window.addEventListener('keydown', handleKeydown);
  if (typeof source?.subscribe === 'function') unsubscribe = source.subscribe(() => update(source));
  update(source);
  setVisible(visible, { dispatch: false });

  return Object.freeze({
    element: hud,
    update,
    openPanel,
    closePanel,
    setVisible,
    toggle,
    get visible() { return visible; },
    get activePanel() { return activePanel; },
    destroy() {
      unsubscribe?.();
      window.removeEventListener('keydown', handleKeydown);
      document.documentElement.classList.remove('cor-modal-open');
      mount.remove();
    },
  });
}

export default createHUD;
