import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import {
  ACTION_TYPES,
  PHASES,
  SAVE_VERSION,
  STORAGE_KEY,
  applyAction,
  clearSavedGame,
  createGameStore,
  createInitialState,
  getAvailableActions,
  loadGameResult,
  saveGame,
  validateAction,
} from '../src/gameState.js';

class MemoryStorage {
  constructor(seed = {}) {
    this.values = new Map(Object.entries(seed));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

function takeAction(state, action, expectedPhase, trace) {
  const result = applyAction(state, action);
  assert.equal(result.ok, true, `${action.type} debe estar disponible en ${state.phase}: ${result.error ?? ''}`);
  assert.equal(result.state.phase, expectedPhase, `${action.type} debe llevar a ${expectedPhase}`);
  assert.notEqual(result.state, state, 'Las transiciones no deben mutar el objeto de entrada.');
  trace.push({
    action: action.type,
    from: state.phase,
    to: result.state.phase,
    revision: result.state.revision,
    status: result.state.workPackage.status,
  });
  return result.state;
}

function expectInvalid(state, action, code, trace) {
  const validation = validateAction(state, action);
  assert.equal(validation.valid, false, `${action.type ?? action} debe rechazarse.`);
  assert.equal(validation.code, code, `Código de rechazo inesperado para ${action.type ?? action}.`);
  const result = applyAction(state, action);
  assert.equal(result.ok, false, `${action.type ?? action} no debe aplicarse.`);
  assert.equal(result.validation.code, code);
  trace.push({ action: action.type ?? String(action), phase: state.phase, rejected: code });
  return result.state;
}

export function runStateAcceptance() {
  const trace = [];
  const storage = new MemoryStorage();
  let state = createInitialState({ sessionId: 'qa-state-machine' });

  assert.equal(state.phase, PHASES[0]);
  assert.equal(state.schemaVersion, SAVE_VERSION);
  assert.equal(state.mission.status, 'active');
  assert.deepEqual(
    getAvailableActions(state).filter((action) => action.enabled).map((action) => action.type),
    [ACTION_TYPES.START_BRIEFING],
    'El briefing debe ofrecer una única acción principal segura.',
  );

  expectInvalid(state, { type: 'QA_UNKNOWN_ACTION' }, 'ACTION_UNKNOWN', trace);
  expectInvalid(state, { type: ACTION_TYPES.AUTHORISE_POUR }, 'WRONG_PHASE', trace);
  expectInvalid(state, { type: ACTION_TYPES.SET_HUD_VISIBILITY }, 'VALUE_INVALID', trace);

  const uiToggle = applyAction(state, { type: ACTION_TYPES.SET_HUD_VISIBILITY, visible: false });
  assert.equal(uiToggle.ok, true);
  assert.equal(uiToggle.state.ui.hudVisible, false);
  assert.equal(state.ui.hudVisible, true, 'La acción UI no debe mutar el estado anterior.');

  state = takeAction(state, { type: ACTION_TYPES.START_BRIEFING }, 'planos', trace);
  state = takeAction(state, { type: ACTION_TYPES.REVIEW_PLANS }, 'cuadrilla', trace);

  const earlySave = saveGame(state, storage);
  assert.equal(earlySave.ok, true);
  const earlyLoad = loadGameResult(storage);
  assert.equal(earlyLoad.ok, true);
  assert.equal(earlyLoad.state.phase, 'cuadrilla');
  assert.equal(earlyLoad.state.flags.plansReviewed, true);
  assert.equal(earlyLoad.state.sessionId, state.sessionId);

  state = expectInvalid(
    state,
    { type: ACTION_TYPES.ASSIGN_CREW, crewId: 'cuadrilla-inexistente' },
    'CREW_UNAVAILABLE',
    trace,
  );
  state = takeAction(state, { type: ACTION_TYPES.ASSIGN_CREW, crewId: 'ferralla-norte' }, 'inspeccion', trace);
  state = takeAction(state, { type: ACTION_TYPES.SCAN_FOUNDATION }, 'correccion', trace);
  assert.equal(state.incidents[0].status, 'open');
  assert.equal(state.element.asBuilt.spacingMm, 270);
  assert.equal(state.workPackage.approval, 'blocked');
  assert.equal(state.inspection.checklist.armadura.status, 'nonconforming');
  assert.ok(state.inspection.evidence.length >= 4, 'El escaneo debe registrar evidencia trazable.');

  const incidentSave = saveGame(state, storage);
  assert.equal(incidentSave.ok, true);
  const incidentLoad = loadGameResult(storage);
  assert.equal(incidentLoad.ok, true);
  assert.equal(incidentLoad.state.incidents[0].status, 'open');
  assert.equal(incidentLoad.state.inspection.findings[0].measured, 270);

  state = takeAction(state, { type: ACTION_TYPES.CORRECT_REBAR }, 'reinspeccion', trace);
  assert.equal(state.incidents[0].status, 'corrected_pending_verification');
  assert.equal(state.workPackage.approval, 'blocked', 'Corregir no debe liberar el punto de parada.');
  assert.equal(state.flags.reinspectionPassed, false);
  assert.equal(state.element.asBuilt.spacingMm, 200);

  state = takeAction(state, { type: ACTION_TYPES.REINSPECT }, 'clima', trace);
  assert.equal(state.incidents[0].status, 'closed');
  assert.equal(state.flags.reinspectionPassed, true);
  assert.equal(state.inspection.status, 'approved');

  const unsafe = applyAction(state, { type: ACTION_TYPES.RISK_POUR_IN_RAIN });
  assert.equal(unsafe.ok, true, 'La decisión insegura debe procesarse para poder rechazarla pedagógicamente.');
  assert.equal(unsafe.state.phase, 'clima', 'Una decisión insegura nunca debe avanzar la fase.');
  assert.equal(unsafe.state.weather.unsafeAttempted, true);
  assert.equal(unsafe.state.profile.unsafeDecisions, 1);
  assert.match(unsafe.state.messages[0].title, /rechazada/i);
  trace.push({
    action: ACTION_TYPES.RISK_POUR_IN_RAIN,
    phase: state.phase,
    acceptedSafely: true,
    advanced: false,
  });
  state = unsafe.state;
  state = expectInvalid(state, { type: ACTION_TYPES.RISK_POUR_IN_RAIN }, 'RISK_ALREADY_REJECTED', trace);

  state = takeAction(state, { type: ACTION_TYPES.REVIEW_WEATHER }, 'vertido', trace);
  assert.equal(state.weather.rescheduled, true);
  assert.equal(state.weather.pourSlot, state.weather.safeWindow);
  assert.equal(state.workPackage.approval, 'released');

  state = takeAction(state, { type: ACTION_TYPES.AUTHORISE_POUR }, 'curado', trace);
  assert.equal(state.flags.pourComplete, true);
  assert.equal(state.pour.ticketVerified, true);
  assert.equal(state.pour.vibration, 'logged_conforming');

  state = takeAction(state, { type: ACTION_TYPES.COMPLETE_CURING }, 'debrief', trace);
  assert.equal(state.flags.curingComplete, true);
  assert.equal(state.curing.elapsedHours, 24);
  assert.equal(state.report.sections.curing, true);

  state = takeAction(state, { type: ACTION_TYPES.CLOSE_REPORT }, 'debrief', trace);
  assert.equal(state.mission.status, 'completed');
  assert.equal(state.workPackage.percent, 100);
  assert.equal(state.report.status, 'signed');
  assert.equal(state.report.traceabilityPercent, 100);
  assert.equal(state.report.evidenceCount, state.inspection.evidence.length);
  assert.equal(state.report.findingsResolved, 1);
  assert.equal(state.mission.grade, 'A', 'La decisión insegura rechazada debe quedar reflejada en el debrief.');

  const visited = [PHASES[0], ...trace.filter((entry) => entry.to).map((entry) => entry.to)];
  assert.deepEqual([...new Set(visited)], PHASES, 'La prueba debe recorrer todas las fases en orden.');
  assert.deepEqual(state.progress.completedPhases, PHASES);

  expectInvalid(state, { type: ACTION_TYPES.CLOSE_REPORT }, 'MISSION_COMPLETED', trace);

  assert.equal(saveGame(state, storage).ok, true);
  const finalLoad = loadGameResult(storage);
  assert.equal(finalLoad.ok, true);
  assert.equal(finalLoad.state.mission.status, 'completed');
  assert.equal(finalLoad.state.report.id, state.report.id);
  assert.equal(finalLoad.state.profile.unsafeDecisions, 1);
  assert.deepEqual(finalLoad.state.progress.completedPhases, PHASES);

  const storeStorage = new MemoryStorage();
  const store = createGameStore({ storage: storeStorage, autosave: true, sessionId: 'qa-store' });
  const storeResult = store.dispatch({ type: ACTION_TYPES.START_BRIEFING });
  assert.equal(storeResult.ok, true);
  assert.ok(storeStorage.getItem(STORAGE_KEY), 'El store debe autoguardar acciones de gameplay.');
  store.reset({ sessionId: 'qa-store-reset' });
  assert.equal(store.getState().phase, 'briefing');
  assert.equal(store.load().ok, true, 'El store debe poder cargar el estado autoguardado tras resetear.');
  assert.equal(store.getState().phase, 'briefing');

  const corruptStorage = new MemoryStorage({ [STORAGE_KEY]: '{json roto' });
  assert.equal(loadGameResult(corruptStorage).code, 'LOAD_FAILED');
  const oldStorage = new MemoryStorage({
    [STORAGE_KEY]: JSON.stringify({ version: SAVE_VERSION + 1, state }),
  });
  assert.equal(loadGameResult(oldStorage).code, 'VERSION_UNSUPPORTED');
  assert.equal(clearSavedGame(storage).ok, true);
  assert.equal(loadGameResult(storage).code, 'SAVE_NOT_FOUND');

  return {
    ok: true,
    phases: PHASES,
    transitionCount: trace.length,
    trace,
    final: {
      missionStatus: state.mission.status,
      report: state.report.id,
      evidence: state.inspection.evidence.length,
      incident: state.incidents[0].status,
      unsafeDecisions: state.profile.unsafeDecisions,
      grade: state.mission.grade,
    },
  };
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isCli) {
  try {
    console.log(JSON.stringify(runStateAcceptance(), null, 2));
  } catch (error) {
    console.error(error.stack || error.message || String(error));
    process.exitCode = 2;
  }
}
