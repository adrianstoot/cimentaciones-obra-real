import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState } from '../../src/gameState.js';
import { SiteSupervisorAI, SUPERVISOR_EVENT_NAME } from '../../src/ai/SiteSupervisorAI.js';

function clock(start = 1_720_000_000_000) {
  let value = start;
  return {
    now: () => value,
    advance: (milliseconds) => { value += milliseconds; },
  };
}

function stateAt(phase, patch = {}) {
  const state = createInitialState({ sessionId: `test-${phase}` });
  state.phase = phase;
  state.phaseIndex = [
    'briefing', 'planos', 'cuadrilla', 'inspeccion', 'correccion',
    'reinspeccion', 'clima', 'vertido', 'curado', 'debrief',
  ].indexOf(phase);
  Object.assign(state, patch);
  return state;
}

function drain(ai, context = {}, limit = 20) {
  const events = [];
  for (let index = 0; index < limit; index += 1) {
    const event = ai.update(context);
    if (!event) break;
    events.push(event);
  }
  return events;
}

test('prioriza un EPI ausente sobre zona de riesgo e instrucción de fase', () => {
  const time = clock();
  const events = [];
  const ai = new SiteSupervisorAI({
    now: time.now,
    globalCooldownMs: 4_500,
    store: { getState: () => stateAt('inspeccion') },
    autoSubscribe: false,
    zones: [{ id: 'edge-z04', label: 'el borde de excavación Z-04', center: { x: 0, z: 0 }, radius: 3 }],
    onEvent: (event) => events.push(event),
  });

  const first = ai.update({
    player: { position: { x: 0, y: 0, z: 0 }, ppe: { helmet: false, vest: true, boots: true } },
  });
  assert.equal(first.ruleId, 'PPE_MISSING');
  assert.equal(first.priority, 100);
  assert.equal(first.blocking, true);
  assert.equal(first.type, SUPERVISOR_EVENT_NAME);
  assert.match(first.text, /casco/);

  time.advance(4_500);
  const second = ai.update({
    player: { position: { x: 0, y: 0, z: 0 }, ppe: { helmet: false, vest: true, boots: true } },
  });
  assert.equal(second.ruleId, 'RISK_ZONE_ENTRY');
  assert.equal(events.length, 2);
  ai.dispose();
});

test('aplica flanco, cooldown por regla y anti-spam global', () => {
  const time = clock();
  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 0, autoSubscribe: false });
  ai.observeState(stateAt('briefing'));

  const first = ai.update({ player: { ppe: { helmet: false } } });
  assert.equal(first.ruleId, 'PPE_MISSING');
  ai.update({ player: { ppe: { helmet: true } } });

  time.advance(1_000);
  const blockedByCooldown = ai.update({ player: { ppe: { helmet: false } } });
  assert.notEqual(blockedByCooldown?.ruleId, 'PPE_MISSING');

  ai.update({ player: { ppe: { helmet: true } } });
  time.advance(30_001);
  const rearmed = ai.update({ player: { ppe: { helmet: false } } });
  assert.equal(rearmed.ruleId, 'PPE_MISSING');
  assert.equal(ai.getHistory().filter((event) => event.ruleId === 'PPE_MISSING').length, 2);
});

test('descarta una advertencia en cola cuando el peligro ya no está presente', () => {
  const time = clock();
  const state = stateAt('inspeccion');
  const ai = new SiteSupervisorAI({
    now: time.now,
    globalCooldownMs: 4_500,
    autoSubscribe: false,
    zones: [{ id: 'edge', label: 'el borde', center: { x: 0, z: 0 }, radius: 2 }],
  });
  ai.observeState(state);

  assert.equal(ai.update({ state, player: { position: { x: 0, z: 0 }, ppe: { helmet: false } } }).ruleId, 'PPE_MISSING');
  assert.equal(ai.update({ state, player: { position: { x: 8, z: 8 }, ppe: { helmet: true } } }), null);
  time.advance(4_500);
  const next = ai.update({ state, player: { position: { x: 8, z: 8 }, ppe: { helmet: true } } });
  assert.notEqual(next?.ruleId, 'RISK_ZONE_ENTRY');
});

test('bloquea y reprende el intento de vertido previo a la liberación', () => {
  const time = clock();
  const state = stateAt('inspeccion');
  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 0, autoSubscribe: false });
  ai.observeState(state);

  assert.equal(ai.reportAction('AUTHORISE_POUR', { ok: false, state }), true);
  const event = ai.update({ state });
  assert.equal(event.ruleId, 'POUR_BEFORE_RELEASE');
  assert.equal(event.blocking, true);
  assert.match(event.text, /punto de parada|liberación/);
  assert.equal(event.context.actionType, 'AUTHORISE_POUR');
});

test('detecta una incidencia ignorada por tiempo o abandono del frente', () => {
  const time = clock();
  const state = stateAt('correccion');
  state.flags.defectDetected = true;
  state.incidents[0].status = 'open';
  state.incidents[0].detectedAt = new Date(time.now()).toISOString();

  const ai = new SiteSupervisorAI({
    now: time.now,
    globalCooldownMs: 0,
    defectIgnoreAfterMs: 20_000,
    autoSubscribe: false,
  });
  ai.observeState(state);
  drain(ai, { state });
  time.advance(20_001);
  const event = ai.update({ state, player: { distanceToDefectM: 2 } });
  assert.equal(event.ruleId, 'DEFECT_IGNORED');
  assert.equal(event.context.incidentId, 'INC-Z04-001');
  assert.match(event.text, /incidencia|no conformidad/i);
});

test('felicita una corrección y una reinspección correctas sin perder trazabilidad', () => {
  const time = clock();
  const before = stateAt('correccion');
  before.flags.defectDetected = true;
  before.incidents[0].status = 'open';
  const after = structuredClone(before);
  after.revision += 1;
  after.phase = 'reinspeccion';
  after.flags.correctionApplied = true;
  after.incidents[0].status = 'corrected_pending_reinspection';

  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 0, autoSubscribe: false });
  ai.observeState(before);
  drain(ai, { state: before });
  ai.observeState(after);
  const correctionEvents = drain(ai, { state: after });
  assert.ok(correctionEvents.some((event) => event.ruleId === 'CORRECTION_GOOD'));

  const verified = structuredClone(after);
  verified.revision += 1;
  verified.phase = 'clima';
  verified.flags.reinspectionPassed = true;
  verified.incidents[0].status = 'closed';
  ai.observeState(verified);
  const verifiedEvents = drain(ai, { state: verified });
  assert.ok(verifiedEvents.some((event) => event.ruleId === 'REINSPECTION_GOOD'));
  assert.ok(ai.getHistory().every((event) => event.trace.generative === false));
});

test('la lluvia obliga a reevaluar y es crítica durante el vertido', () => {
  const time = clock();
  const state = stateAt('vertido');
  state.workPackage.approval = 'released';
  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 0, autoSubscribe: false });
  ai.observeState(state);

  const event = ai.update({ state, weather: { mode: 'rain' } });
  assert.equal(event.ruleId, 'RAIN_DURING_POUR');
  assert.equal(event.blocking, true);
  assert.match(event.text, /reevaluar|Escala/);
});

test('la inactividad usa el mensaje específico de la fase y no molesta con la tablet abierta', () => {
  const time = clock();
  const state = stateAt('planos');
  const ai = new SiteSupervisorAI({
    now: time.now,
    globalCooldownMs: 0,
    idleAfterMs: 10_000,
    autoSubscribe: false,
  });
  ai.observeState(state);
  drain(ai, { state });

  time.advance(10_001);
  const idle = ai.update({ state });
  assert.equal(idle.ruleId, 'PLAYER_IDLE');
  assert.match(idle.text, /tres documentos/);

  time.advance(70_000);
  const whileReading = ai.update({ state, ui: { tabletOpen: true } });
  assert.equal(whileReading, null);
});

test('observa el auditTrail del store aunque la acción rechazada no se reporte manualmente', () => {
  const time = clock();
  let state = stateAt('inspeccion');
  const listeners = new Set();
  const store = {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 0, store });
  drain(ai, { state });

  state = structuredClone(state);
  state.revision += 1;
  state.auditTrail.push({
    id: 'audit-rejected-pour',
    at: new Date(time.now()).toISOString(),
    action: 'AUTHORISE_POUR',
    outcome: 'rejected',
    phase: 'inspeccion',
  });
  listeners.forEach((listener) => listener(state, { ok: false }));
  const event = ai.update({ state });
  assert.equal(event.ruleId, 'POUR_BEFORE_RELEASE');
  ai.dispose();
  assert.equal(listeners.size, 0);
});

test('la suciedad y el acceso bloqueado activan una llamada de atención independiente', () => {
  const time = clock();
  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 0, autoSubscribe: false });
  ai.observeState(stateAt('cuadrilla'));
  const event = ai.update({ safety: { housekeepingOk: false } });
  assert.equal(event.ruleId, 'HOUSEKEEPING_UNSAFE');
  assert.match(event.text, /acceso|itinerario/);
});

test('descarta avisos de una fase cerrada antes de mostrar la siguiente', () => {
  const time = clock();
  const climate = stateAt('clima');
  climate.weather.reviewed = false;
  const ai = new SiteSupervisorAI({ now: time.now, globalCooldownMs: 90_000, autoSubscribe: false });
  ai.observeState(climate);
  ai.flush();
  time.advance(100);
  ai._queueRule('FORECAST_REVIEW', { phase: 'clima', recommendedAction: 'REVIEW_WEATHER' }, { cooldownKey: 'qa-stale-forecast' });
  assert.ok(ai.pending.some((candidate) => candidate.ruleId === 'FORECAST_REVIEW'));

  const debrief = structuredClone(climate);
  debrief.revision += 1;
  debrief.phase = 'debrief';
  debrief.flags.pourComplete = true;
  debrief.flags.curingComplete = true;
  ai.observeState(debrief);
  assert.equal(ai.pending.some((candidate) => candidate.ruleId === 'FORECAST_REVIEW'), false);
});
