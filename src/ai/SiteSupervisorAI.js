import { DialogueDirector, PHASE_GUIDANCE } from './DialogueDirector.js';

export const SUPERVISOR_EVENT_NAME = 'cor:supervisor-message';

export const SUPERVISOR_RULES = Object.freeze({
  PHASE_INSTRUCTION: Object.freeze({ scriptId: 'phase.instruction', priority: 30, cooldownMs: 300_000 }),
  RISK_ZONE_ENTRY: Object.freeze({ scriptId: 'safety.risk-zone', priority: 86, cooldownMs: 35_000 }),
  PPE_MISSING: Object.freeze({ scriptId: 'safety.ppe-missing', priority: 100, cooldownMs: 30_000, interrupt: true, blocking: true }),
  HOUSEKEEPING_UNSAFE: Object.freeze({ scriptId: 'safety.housekeeping', priority: 88, cooldownMs: 45_000 }),
  POUR_BEFORE_RELEASE: Object.freeze({ scriptId: 'procedure.pour-before-release', priority: 98, cooldownMs: 30_000, interrupt: true, blocking: true }),
  DEFECT_DETECTED: Object.freeze({ scriptId: 'quality.defect-detected', priority: 77, cooldownMs: 120_000 }),
  DEFECT_IGNORED: Object.freeze({ scriptId: 'quality.defect-ignored', priority: 91, cooldownMs: 45_000 }),
  RAIN_REEVALUATE: Object.freeze({ scriptId: 'weather.rain-reevaluate', priority: 82, cooldownMs: 60_000 }),
  RAIN_DURING_POUR: Object.freeze({ scriptId: 'weather.rain-during-pour', priority: 97, cooldownMs: 30_000, interrupt: true, blocking: true }),
  FORECAST_REVIEW: Object.freeze({ scriptId: 'weather.forecast-review', priority: 62, cooldownMs: 120_000 }),
  PLAYER_IDLE: Object.freeze({ scriptId: 'behaviour.idle', priority: 20, cooldownMs: 60_000 }),
  CORRECTION_GOOD: Object.freeze({ scriptId: 'quality.correction-good', priority: 55, cooldownMs: 120_000 }),
  REINSPECTION_GOOD: Object.freeze({ scriptId: 'quality.reinspection-good', priority: 58, cooldownMs: 120_000 }),
  WEATHER_DECISION_GOOD: Object.freeze({ scriptId: 'management.weather-good', priority: 52, cooldownMs: 120_000 }),
  TRACEABILITY_GOOD: Object.freeze({ scriptId: 'mission.traceability-good', priority: 60, cooldownMs: 300_000 }),
});

const PPE_LABELS = Object.freeze({
  helmet: 'el casco', casco: 'el casco',
  vest: 'el chaleco de alta visibilidad', chaleco: 'el chaleco de alta visibilidad',
  boots: 'el calzado de seguridad', botas: 'el calzado de seguridad',
  gloves: 'los guantes adecuados', guantes: 'los guantes adecuados',
  glasses: 'la protección ocular', gafas: 'la protección ocular',
  hearing: 'la protección auditiva', auditiva: 'la protección auditiva',
});

function finite(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function extractPosition(player) {
  const position = player?.position ?? player?.group?.position ?? player?.object?.position;
  if (!position) return null;
  if (Array.isArray(position)) return { x: finite(position[0]), y: finite(position[1]), z: finite(position[2]) };
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return null;
  return { x: position.x, y: finite(position.y), z: position.z };
}

function flatSpeed(player) {
  const velocity = player?.velocity ?? player?.body?.velocity;
  if (!velocity) return 0;
  if (Array.isArray(velocity)) return Math.hypot(finite(velocity[0]), finite(velocity[2]));
  return Math.hypot(finite(velocity.x), finite(velocity.z));
}

function pointInPolygon(position, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = finite(polygon[i].x ?? polygon[i][0]);
    const zi = finite(polygon[i].z ?? polygon[i][1]);
    const xj = finite(polygon[j].x ?? polygon[j][0]);
    const zj = finite(polygon[j].z ?? polygon[j][1]);
    const intersects = ((zi > position.z) !== (zj > position.z))
      && position.x < ((xj - xi) * (position.z - zi)) / ((zj - zi) || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function zoneContains(zone, position, context) {
  if (typeof zone.contains === 'function') return Boolean(zone.contains(position, context));
  if (Array.isArray(zone.polygon) && zone.polygon.length >= 3) return pointInPolygon(position, zone.polygon);
  if (zone.min && zone.max) {
    return position.x >= finite(zone.min.x) && position.x <= finite(zone.max.x)
      && position.z >= finite(zone.min.z) && position.z <= finite(zone.max.z);
  }
  const center = zone.center ?? zone.position;
  if (center && Number.isFinite(zone.radius)) {
    return Math.hypot(position.x - finite(center.x), position.z - finite(center.z)) <= zone.radius;
  }
  return false;
}

function isOpenIncident(incident) {
  return incident && !['latent', 'closed', 'resolved', 'cancelled'].includes(incident.status);
}

function takeStateSnapshot(state) {
  if (!state) return null;
  return {
    revision: state.revision ?? null,
    phase: state.phase ?? 'briefing',
    correctionApplied: Boolean(state.flags?.correctionApplied),
    defectDetected: Boolean(state.flags?.defectDetected),
    reinspectionPassed: Boolean(state.flags?.reinspectionPassed),
    weatherPlanApproved: Boolean(state.flags?.weatherPlanApproved),
    pourComplete: Boolean(state.flags?.pourComplete),
    reportClosed: Boolean(state.flags?.reportClosed),
    approval: state.workPackage?.approval ?? 'pending',
    pourStatus: state.pour?.status ?? 'not_authorised',
    missionStatus: state.mission?.status ?? 'active',
    openIncident: state.incidents?.find(isOpenIncident) ?? null,
  };
}

function rainFrom(context, state) {
  const raw = context.weather?.mode
    ?? context.weather?.condition
    ?? context.weatherMode
    ?? state?.weather?.current?.condition
    ?? '';
  return context.weather?.raining === true || /rain|lluv|torment|precipit/i.test(String(raw));
}

function normalizePpe(context) {
  const source = context.safety?.ppe ?? context.player?.ppe ?? context.ppe;
  if (!source || typeof source !== 'object') return [];
  const missing = [];
  for (const [key, value] of Object.entries(source)) {
    if (value === false) missing.push(PPE_LABELS[key] ?? key);
  }
  return [...new Set(missing)];
}

function unsafeHousekeeping(context) {
  const safety = context.safety ?? {};
  return safety.housekeepingOk === false
    || safety.orderly === false
    || safety.accessClear === false
    || safety.blockedAccess === true
    || context.housekeepingOk === false;
}

/**
 * Stateful, deterministic supervisor for the construction site.
 *
 * Integration:
 *   const ai = new SiteSupervisorAI({ store, zones });
 *   ai.subscribe((event) => hud.showSupervisorMessage(event));
 *   ai.update(delta, { player, weather: { mode }, safety: { ppe } });
 *
 * `update()` returns the event emitted on that frame (or null), making it easy
 * to bridge into an existing HUD without changing the game store schema.
 */
export class SiteSupervisorAI {
  constructor(options = {}) {
    this.now = options.now ?? (() => Date.now());
    this.director = options.director ?? new DialogueDirector();
    this.globalCooldownMs = options.globalCooldownMs ?? 4_500;
    this.idleAfterMs = options.idleAfterMs ?? 38_000;
    this.defectIgnoreAfterMs = options.defectIgnoreAfterMs ?? 24_000;
    this.movementThresholdM = options.movementThresholdM ?? 0.08;
    this.maxQueue = options.maxQueue ?? 12;
    this.maxHistory = options.maxHistory ?? 80;
    this.zones = [...(options.zones ?? [])];
    this.listeners = new Set();
    if (typeof options.onEvent === 'function') this.listeners.add(options.onEvent);
    this.pending = [];
    this.history = [];
    this.acknowledged = new Set();
    this.ruleLastEmittedAt = new Map();
    this.ruleOccurrences = new Map();
    this.conditions = new Map();
    this.activeZoneIds = new Set();
    this.processedAuditIds = new Set();
    this.sequence = 0;
    this.lastEmittedAt = -Infinity;
    this.lastEmittedPriority = -Infinity;
    this.lastPosition = null;
    this.lastActivityAt = this.now();
    this.phaseEnteredAt = this.now();
    this.defectOpenSince = null;
    this.state = null;
    this.snapshot = null;
    this.store = options.store ?? null;
    this.unsubscribeStore = null;

    if (this.store?.getState) this.observeState(this.store.getState(), { initial: true });
    if (this.store?.subscribe && options.autoSubscribe !== false) {
      this.unsubscribeStore = this.store.subscribe((state, result) => this.observeState(state, result));
    }
  }

  subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('subscribe requiere una función.');
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setZones(zones = []) {
    this.zones = [...zones];
    this.activeZoneIds.clear();
  }

  recordActivity(_reason = 'interaction') {
    this.lastActivityAt = this.now();
    for (const phase of Object.keys(PHASE_GUIDANCE)) this.conditions.set(`idle:${phase}`, false);
  }

  acknowledge(eventId) {
    if (!eventId || !this.history.some((event) => event.id === eventId)) return false;
    this.acknowledged.add(eventId);
    return true;
  }

  getHistory() {
    return this.history.map((event) => ({ ...event, acknowledged: this.acknowledged.has(event.id) }));
  }

  getPendingCount() {
    return this.pending.length;
  }

  _rising(key, active) {
    const previous = this.conditions.get(key) === true;
    this.conditions.set(key, Boolean(active));
    return Boolean(active) && !previous;
  }

  _dropPending(predicate) {
    this.pending = this.pending.filter((candidate) => !predicate(candidate));
  }

  _queueRule(ruleId, context = {}, overrides = {}) {
    const rule = SUPERVISOR_RULES[ruleId];
    if (!rule) throw new RangeError(`Regla de supervisión desconocida: ${ruleId}`);
    const phase = context.phase ?? this.state?.phase ?? 'briefing';
    const dedupeKey = overrides.dedupeKey ?? `${ruleId}:${phase}`;
    const cooldownKey = overrides.cooldownKey ?? dedupeKey;
    const now = this.now();
    const last = this.ruleLastEmittedAt.get(cooldownKey);
    if (last !== undefined && now - last < (overrides.cooldownMs ?? rule.cooldownMs)) return false;
    if (this.pending.some((candidate) => candidate.dedupeKey === dedupeKey)) return false;

    this.pending.push({
      ruleId,
      rule,
      phase,
      context,
      dedupeKey,
      cooldownKey,
      priority: overrides.priority ?? rule.priority,
      interrupt: overrides.interrupt ?? rule.interrupt ?? false,
      blocking: overrides.blocking ?? rule.blocking ?? false,
      queuedAt: now,
      sequence: this.sequence++,
    });
    this.pending.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
    if (this.pending.length > this.maxQueue) this.pending.length = this.maxQueue;
    return true;
  }

  _emit(candidate, now) {
    const occurrence = this.ruleOccurrences.get(candidate.cooldownKey) ?? 0;
    const authored = this.director.resolve(candidate.rule.scriptId, {
      ...candidate.context,
      phase: candidate.phase,
      occurrence,
    });
    const event = Object.freeze({
      id: `supervisor-${Math.round(now).toString(36)}-${this.sequence++}`,
      type: SUPERVISOR_EVENT_NAME,
      ruleId: candidate.ruleId,
      priority: candidate.priority,
      blocking: candidate.blocking,
      phase: candidate.phase,
      stateRevision: this.state?.revision ?? null,
      createdAt: new Date(now).toISOString(),
      cooldownMs: candidate.rule.cooldownMs,
      ...authored,
      context: Object.freeze({
        zoneId: candidate.context.zoneId ?? null,
        incidentId: candidate.context.incidentId ?? null,
        actionType: candidate.context.actionType ?? null,
      }),
    });
    this.ruleLastEmittedAt.set(candidate.cooldownKey, now);
    this.ruleOccurrences.set(candidate.cooldownKey, occurrence + 1);
    this.lastEmittedAt = now;
    this.lastEmittedPriority = candidate.priority;
    this.history.push(event);
    if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
    this.listeners.forEach((listener) => listener(event));
    return event;
  }

  flush() {
    if (!this.pending.length) return null;
    const now = this.now();
    const globallyReady = now - this.lastEmittedAt >= this.globalCooldownMs;
    let index = globallyReady ? 0 : this.pending.findIndex((candidate) => (
      candidate.interrupt && candidate.priority > this.lastEmittedPriority
    ));
    if (index < 0) return null;
    const [candidate] = this.pending.splice(index, 1);
    return this._emit(candidate, now);
  }

  _processAudit(state) {
    const trail = state?.auditTrail ?? [];
    for (const item of trail.slice(-20)) {
      if (!item?.id || this.processedAuditIds.has(item.id)) continue;
      this.processedAuditIds.add(item.id);
      if (item.action && item.action !== 'CREATE_SESSION') this.recordActivity('store-action');
      if (item.action === 'AUTHORISE_POUR' && item.outcome !== 'accepted') {
        this._queueRule('POUR_BEFORE_RELEASE', {
          phase: state.phase,
          actionType: item.action,
          variables: {},
          recommendedAction: PHASE_GUIDANCE[state.phase]?.action,
        }, { cooldownKey: 'POUR_BEFORE_RELEASE' });
      }
      if (item.action === 'RISK_POUR_IN_RAIN') {
        this._queueRule('RAIN_DURING_POUR', {
          phase: state.phase,
          actionType: item.action,
          recommendedAction: 'REVIEW_WEATHER',
        }, { cooldownKey: 'RAIN_DURING_POUR' });
      }
    }
    if (this.processedAuditIds.size > 240) {
      const retained = [...this.processedAuditIds].slice(-120);
      this.processedAuditIds = new Set(retained);
    }
  }

  observeState(state, result = {}) {
    if (!state || typeof state !== 'object') return;
    const previous = this.snapshot;
    const next = takeStateSnapshot(state);
    this.state = state;
    this.snapshot = next;

    if (!previous || previous.phase !== next.phase) {
      const persistentSafetyRules = new Set(['PPE_MISSING', 'HOUSEKEEPING_UNSAFE', 'RISK_ZONE_ENTRY']);
      this._dropPending((candidate) => candidate.phase !== next.phase && !persistentSafetyRules.has(candidate.ruleId));
      this.phaseEnteredAt = this.now();
      this.recordActivity('phase-change');
      this._queueRule('PHASE_INSTRUCTION', {
        phase: next.phase,
        recommendedAction: PHASE_GUIDANCE[next.phase]?.action,
      }, {
        dedupeKey: `PHASE_INSTRUCTION:${next.phase}`,
        cooldownKey: `PHASE_INSTRUCTION:${next.phase}`,
      });
    }

    const defectOpen = next.defectDetected && !next.correctionApplied;
    const wasDefectOpen = previous?.defectDetected && !previous?.correctionApplied;
    if (defectOpen && !wasDefectOpen) {
      this.defectOpenSince = this.now();
      this._queueRule('DEFECT_DETECTED', {
        phase: next.phase,
        incidentId: next.openIncident?.id,
        variables: { incident: next.openIncident?.title ?? 'de armadura' },
        recommendedAction: 'CORRECT_REBAR',
      }, { cooldownKey: `DEFECT_DETECTED:${next.openIncident?.id ?? 'z04'}` });
    }
    if (!defectOpen) this.defectOpenSince = null;

    if (previous && !previous.correctionApplied && next.correctionApplied) {
      this._queueRule('CORRECTION_GOOD', { phase: next.phase, recommendedAction: 'REINSPECT' }, { cooldownKey: 'CORRECTION_GOOD:z04' });
    }
    if (previous && !previous.reinspectionPassed && next.reinspectionPassed) {
      this._queueRule('REINSPECTION_GOOD', { phase: next.phase, recommendedAction: 'REVIEW_WEATHER' }, { cooldownKey: 'REINSPECTION_GOOD:z04' });
    }
    if (previous && !previous.weatherPlanApproved && next.weatherPlanApproved) {
      this._queueRule('WEATHER_DECISION_GOOD', { phase: next.phase, recommendedAction: 'AUTHORISE_POUR' }, { cooldownKey: 'WEATHER_DECISION_GOOD:z04' });
    }
    if (previous && !previous.reportClosed && next.reportClosed) {
      this._queueRule('TRACEABILITY_GOOD', { phase: next.phase, recommendedAction: null }, { cooldownKey: 'TRACEABILITY_GOOD:mission' });
    }

    if (!previous) {
      // A loaded game may contain rejected actions from an earlier session.
      // Mark them as seen without replaying obsolete reprimands on start-up.
      for (const item of state.auditTrail ?? []) if (item?.id) this.processedAuditIds.add(item.id);
    } else {
      this._processAudit(state, result);
    }
  }

  reportAction(action, result = {}, context = {}) {
    const type = typeof action === 'string' ? action : action?.type;
    if (!type) return false;
    this.recordActivity('reported-action');
    const state = result.state ?? context.state ?? this.state;
    const blocked = result.ok === false || state?.workPackage?.approval !== 'released';
    if (type === 'AUTHORISE_POUR' && blocked) {
      return this._queueRule('POUR_BEFORE_RELEASE', {
        phase: state?.phase ?? 'vertido', actionType: type,
        recommendedAction: PHASE_GUIDANCE[state?.phase]?.action,
      }, { cooldownKey: 'POUR_BEFORE_RELEASE' });
    }
    if (type === 'RISK_POUR_IN_RAIN') {
      return this._queueRule('RAIN_DURING_POUR', {
        phase: state?.phase ?? 'clima', actionType: type, recommendedAction: 'REVIEW_WEATHER',
      }, { cooldownKey: 'RAIN_DURING_POUR' });
    }
    const open = state?.flags?.defectDetected && !state?.flags?.correctionApplied;
    if (open && !['SCAN_FOUNDATION', 'CORRECT_REBAR', 'REINSPECT', 'SET_TABLET_OPEN', 'SET_ACTIVE_PANEL'].includes(type)) {
      return this._queueDefectIgnored(state, { actionType: type });
    }
    return false;
  }

  _queueDefectIgnored(state, extra = {}) {
    const incident = state?.incidents?.find(isOpenIncident);
    return this._queueRule('DEFECT_IGNORED', {
      phase: state?.phase ?? 'correccion',
      incidentId: incident?.id,
      variables: { incident: incident?.title ?? 'de armadura' },
      recommendedAction: 'CORRECT_REBAR',
      ...extra,
    }, { cooldownKey: `DEFECT_IGNORED:${incident?.id ?? 'z04'}` });
  }

  _evaluateMovement(context) {
    const position = extractPosition(context.player);
    const movingFlag = context.player?.moving === true || context.player?.isMoving === true;
    const movingBySpeed = flatSpeed(context.player) > 0.06;
    let moved = false;
    if (position && this.lastPosition) {
      moved = Math.hypot(position.x - this.lastPosition.x, position.z - this.lastPosition.z) >= this.movementThresholdM;
    }
    if (position) this.lastPosition = position;
    if (movingFlag || movingBySpeed || moved || context.activity === true) this.recordActivity('movement');
    return position;
  }

  _evaluateRiskZones(context, position) {
    const current = new Map();
    if (position) {
      for (const zone of this.zones) {
        const phaseAllowed = !zone.activePhases || zone.activePhases.includes(this.state?.phase);
        if (phaseAllowed && zoneContains(zone, position, context)) current.set(zone.id ?? zone.label, zone);
      }
    }

    const explicit = context.player?.riskZones ?? context.safety?.riskZones ?? context.riskZones;
    const list = explicit === undefined ? [] : Array.isArray(explicit) ? explicit : [explicit];
    for (const entry of list) {
      const zone = typeof entry === 'string' ? { id: entry, label: entry } : entry;
      if (zone?.id || zone?.label) current.set(zone.id ?? zone.label, zone);
    }

    this._dropPending((candidate) => (
      candidate.ruleId === 'RISK_ZONE_ENTRY' && !current.has(candidate.context.zoneId)
    ));

    for (const [id, zone] of current) {
      if (!this.activeZoneIds.has(id)) {
        this._queueRule('RISK_ZONE_ENTRY', {
          phase: this.state?.phase,
          zoneId: id,
          variables: { zone: zone.label ?? zone.name ?? 'la zona de riesgo' },
          recommendedAction: zone.recommendedAction ?? 'STOP_AND_CHECK',
        }, {
          dedupeKey: `RISK_ZONE_ENTRY:${id}`,
          cooldownKey: `RISK_ZONE_ENTRY:${id}`,
          priority: zone.severity === 'critical' ? 94 : undefined,
        });
      }
    }
    this.activeZoneIds = new Set(current.keys());
  }

  _evaluateSafety(context) {
    const missing = normalizePpe(context);
    if (missing.length === 0) this._dropPending((candidate) => candidate.ruleId === 'PPE_MISSING');
    if (this._rising('ppe-missing', missing.length > 0)) {
      this._queueRule('PPE_MISSING', {
        phase: this.state?.phase,
        variables: { missingPpe: missing.join(', ') },
        recommendedAction: 'RESTORE_PPE',
      }, { cooldownKey: `PPE_MISSING:${missing.sort().join('|')}` });
    }
    const disorder = unsafeHousekeeping(context);
    if (!disorder) this._dropPending((candidate) => candidate.ruleId === 'HOUSEKEEPING_UNSAFE');
    if (this._rising('housekeeping-unsafe', disorder)) {
      this._queueRule('HOUSEKEEPING_UNSAFE', {
        phase: this.state?.phase,
        recommendedAction: 'CLEAR_ACCESS',
      }, { cooldownKey: 'HOUSEKEEPING_UNSAFE' });
    }
  }

  _evaluateWeather(context) {
    const state = this.state;
    const phase = state?.phase ?? 'briefing';
    const raining = rainFrom(context, state);
    const pouring = phase === 'vertido' || ['authorised', 'pouring'].includes(state?.pour?.status);
    if (!raining) this._dropPending((candidate) => ['RAIN_REEVALUATE', 'RAIN_DURING_POUR'].includes(candidate.ruleId));
    const rainKey = `rain:${phase}`;
    if (this._rising(rainKey, raining)) {
      this._queueRule(pouring ? 'RAIN_DURING_POUR' : 'RAIN_REEVALUATE', {
        phase,
        recommendedAction: pouring ? 'STOP_AND_REASSESS' : 'REVIEW_WEATHER',
      }, { cooldownKey: `${pouring ? 'RAIN_DURING_POUR' : 'RAIN_REEVALUATE'}:${phase}` });
    }
    if (this._rising('forecast-review', phase === 'clima' && !state?.weather?.reviewed)) {
      this._queueRule('FORECAST_REVIEW', { phase, recommendedAction: 'REVIEW_WEATHER' }, { cooldownKey: 'FORECAST_REVIEW:z04' });
    }
  }

  _evaluateDefect(context) {
    const state = this.state;
    const open = Boolean(state?.flags?.defectDetected && !state?.flags?.correctionApplied);
    if (!open) {
      this._dropPending((candidate) => ['DEFECT_DETECTED', 'DEFECT_IGNORED'].includes(candidate.ruleId));
      this.conditions.set('defect-ignored', false);
      this.defectOpenSince = null;
      return;
    }
    if (this.defectOpenSince === null) this.defectOpenSince = this.now();
    const explicit = context.player?.ignoringDefect === true || context.ignoringDefect === true;
    const leftWorkfront = Number.isFinite(context.player?.distanceToDefectM)
      && context.player.distanceToDefectM > (context.defectAttentionRadiusM ?? 12);
    const overdue = this.now() - this.defectOpenSince >= this.defectIgnoreAfterMs;
    if (this._rising('defect-ignored', explicit || leftWorkfront || overdue)) this._queueDefectIgnored(state);
  }

  _evaluateIdle(context) {
    const phase = this.state?.phase ?? 'briefing';
    const uiEngaged = context.paused === true
      || context.player?.paused === true
      || context.ui?.modalOpen === true
      || context.ui?.tabletOpen === true
      || this.state?.ui?.tabletOpen === true;
    const missionComplete = this.state?.mission?.status === 'completed';
    if (uiEngaged || missionComplete) {
      this.lastActivityAt = this.now();
      return;
    }
    const idle = this.now() - this.lastActivityAt >= this.idleAfterMs;
    if (!idle) this._dropPending((candidate) => candidate.ruleId === 'PLAYER_IDLE');
    if (this._rising(`idle:${phase}`, idle)) {
      this._queueRule('PLAYER_IDLE', {
        phase,
        variables: { idlePrompt: PHASE_GUIDANCE[phase]?.idle },
        recommendedAction: PHASE_GUIDANCE[phase]?.action,
      }, { cooldownKey: `PLAYER_IDLE:${phase}` });
      // Start a fresh inactivity window even if a higher-priority alert emits first.
      this.lastActivityAt = this.now();
    }
  }

  update(deltaOrContext = 0, maybeContext = {}) {
    const context = typeof deltaOrContext === 'object' ? deltaOrContext : maybeContext;
    const currentState = context.state ?? this.store?.getState?.();
    const currentSnapshot = takeStateSnapshot(currentState);
    if (currentState && (
      !this.snapshot
      || currentSnapshot.revision !== this.snapshot.revision
      || currentSnapshot.phase !== this.snapshot.phase
      || currentSnapshot.defectDetected !== this.snapshot.defectDetected
      || currentSnapshot.correctionApplied !== this.snapshot.correctionApplied
      || currentSnapshot.reinspectionPassed !== this.snapshot.reinspectionPassed
      || currentSnapshot.weatherPlanApproved !== this.snapshot.weatherPlanApproved
      || currentSnapshot.reportClosed !== this.snapshot.reportClosed
    )) this.observeState(currentState);

    if (context.action) this.reportAction(context.action, context.actionResult ?? {}, context);
    const position = this._evaluateMovement(context);
    this._evaluateRiskZones(context, position);
    this._evaluateSafety(context);
    this._evaluateWeather(context);
    this._evaluateDefect(context);
    this._evaluateIdle(context);
    return this.flush();
  }

  tick(delta, context) {
    return this.update(delta, context);
  }

  dispose() {
    this.unsubscribeStore?.();
    this.unsubscribeStore = null;
    this.listeners.clear();
    this.pending.length = 0;
  }
}

export default SiteSupervisorAI;
