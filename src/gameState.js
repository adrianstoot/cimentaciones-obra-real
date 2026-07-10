/**
 * Cimentaciones: Obra Real — vertical-slice state model.
 *
 * This module deliberately has no dependency on Three.js or the DOM. Every
 * gameplay transition is serialisable, validated and deterministic apart from
 * generated ids/timestamps. Rendering code can consume `getUIData(state)` and
 * dispatch the actions exposed by `getAvailableActions(state)`.
 */

export const SAVE_VERSION = 1;
export const STORAGE_KEY = "cimentaciones-obra-real:web:v1";

export const PHASES = Object.freeze([
  "briefing",
  "planos",
  "cuadrilla",
  "inspeccion",
  "correccion",
  "reinspeccion",
  "clima",
  "vertido",
  "curado",
  "debrief",
]);

export const PHASE_DEFINITIONS = Object.freeze({
  briefing: {
    index: 0,
    label: "Briefing de seguridad",
    kicker: "PAQUETE Z-04 · INICIO",
    objective: "Recibe el encargo y confirma el punto de parada de la zapata Z-04.",
    instruction: "Habla con la jefa de producción situada junto al campo de cimentaciones.",
    location: "Campo de cimentaciones · acceso sur",
    icon: "helmet",
    tone: "yellow",
  },
  planos: {
    index: 1,
    label: "Planos y prescripciones",
    kicker: "DOCUMENTACIÓN",
    objective: "Contrasta el plano C-101, el geotécnico y el plan de control.",
    instruction: "Abre la tablet y valida los datos específicos de la zapata Z-04.",
    location: "Mesa de planos",
    icon: "blueprint",
    tone: "blue",
  },
  cuadrilla: {
    index: 2,
    label: "Asignación de cuadrilla",
    kicker: "PLANIFICACIÓN",
    objective: "Asigna una cuadrilla competente y reserva los medios necesarios.",
    instruction: "Selecciona Ferralla Norte y confirma su charla de tarea.",
    location: "Zona de coordinación",
    icon: "crew",
    tone: "orange",
  },
  inspeccion: {
    index: 3,
    label: "Inspección previa",
    kicker: "PUNTO DE PARADA",
    objective: "Escanea la armadura, mide recubrimiento, separación y cota.",
    instruction: "Usa la tablet sobre la zapata Z-04 y registra evidencia.",
    location: "Campo de cimentaciones",
    icon: "scan",
    tone: "cyan",
  },
  correccion: {
    index: 4,
    label: "Corrección de armadura",
    kicker: "INCIDENCIA ABIERTA",
    objective: "Corrige la separación fuera de proyecto sin ocultar la no conformidad.",
    instruction: "Ordena el reajuste de barras y documenta la corrección.",
    location: "Zapata Z-04",
    icon: "tools",
    tone: "red",
  },
  reinspeccion: {
    index: 5,
    label: "Reinspección",
    kicker: "VERIFICACIÓN",
    objective: "Comprueba de nuevo la geometría y cierra la incidencia con evidencia.",
    instruction: "Repite la medición antes de liberar el punto de parada.",
    location: "Zapata Z-04",
    icon: "check",
    tone: "green",
  },
  clima: {
    index: 6,
    label: "Ventana de hormigonado",
    kicker: "METEOROLOGÍA",
    objective: "Evalúa el frente de lluvia y reprograma el suministro de forma segura.",
    instruction: "Cruza previsión, acceso de camiones y capacidad de protección.",
    location: "Oficina de producción",
    icon: "weather",
    tone: "blue",
  },
  vertido: {
    index: 7,
    label: "Autorización y vertido",
    kicker: "HORMIGÓN FRESCO",
    objective: "Autoriza el lote, controla la recepción y completa el vertido.",
    instruction: "Verifica albarán, consistencia, trazabilidad y secuencia de vibrado.",
    location: "Área de hormigonado",
    icon: "concrete",
    tone: "yellow",
  },
  curado: {
    index: 8,
    label: "Curado y protección",
    kicker: "CONTROL TEMPRANO",
    objective: "Protege el elemento y registra el primer ciclo de curado.",
    instruction: "Comprueba membrana, temperatura, humedad y señalización.",
    location: "Zapata Z-04",
    icon: "droplet",
    tone: "cyan",
  },
  debrief: {
    index: 9,
    label: "Informe de calidad",
    kicker: "CIERRE",
    objective: "Revisa la trazabilidad y firma el informe interno de aprendizaje.",
    instruction: "Comprueba evidencias, incidencia, lote y registro de curado.",
    location: "Oficina técnica",
    icon: "report",
    tone: "green",
  },
});

export const ACTION_TYPES = Object.freeze({
  START_BRIEFING: "START_BRIEFING",
  REVIEW_PLANS: "REVIEW_PLANS",
  ASSIGN_CREW: "ASSIGN_CREW",
  SCAN_FOUNDATION: "SCAN_FOUNDATION",
  CORRECT_REBAR: "CORRECT_REBAR",
  REINSPECT: "REINSPECT",
  REVIEW_WEATHER: "REVIEW_WEATHER",
  AUTHORISE_POUR: "AUTHORISE_POUR",
  COMPLETE_CURING: "COMPLETE_CURING",
  CLOSE_REPORT: "CLOSE_REPORT",
  RISK_POUR_IN_RAIN: "RISK_POUR_IN_RAIN",
  SET_HUD_VISIBILITY: "SET_HUD_VISIBILITY",
  TOGGLE_HUD: "TOGGLE_HUD",
  SET_TABLET_OPEN: "SET_TABLET_OPEN",
  SET_ACTIVE_PANEL: "SET_ACTIVE_PANEL",
  DISMISS_MESSAGE: "DISMISS_MESSAGE",
});

const MAIN_ACTION_BY_PHASE = Object.freeze({
  briefing: ACTION_TYPES.START_BRIEFING,
  planos: ACTION_TYPES.REVIEW_PLANS,
  cuadrilla: ACTION_TYPES.ASSIGN_CREW,
  inspeccion: ACTION_TYPES.SCAN_FOUNDATION,
  correccion: ACTION_TYPES.CORRECT_REBAR,
  reinspeccion: ACTION_TYPES.REINSPECT,
  clima: ACTION_TYPES.REVIEW_WEATHER,
  vertido: ACTION_TYPES.AUTHORISE_POUR,
  curado: ACTION_TYPES.COMPLETE_CURING,
  debrief: ACTION_TYPES.CLOSE_REPORT,
});

export const ACTION_CATALOG = Object.freeze({
  [ACTION_TYPES.START_BRIEFING]: {
    phase: "briefing",
    label: "Aceptar encargo",
    description: "Confirma el briefing, los EPI y el punto de reunión.",
    icon: "helmet",
    tone: "primary",
  },
  [ACTION_TYPES.REVIEW_PLANS]: {
    phase: "planos",
    label: "Revisar documentación",
    description: "Lee los tres documentos y fija los datos de proyecto.",
    icon: "blueprint",
    tone: "primary",
  },
  [ACTION_TYPES.ASSIGN_CREW]: {
    phase: "cuadrilla",
    label: "Asignar Ferralla Norte",
    description: "Reserva 3 oficiales y confirma medios y charla de tarea.",
    icon: "crew",
    tone: "primary",
  },
  [ACTION_TYPES.SCAN_FOUNDATION]: {
    phase: "inspeccion",
    label: "Escanear zapata",
    description: "Ejecuta la inspección RA y registra las mediciones.",
    icon: "scan",
    tone: "primary",
  },
  [ACTION_TYPES.CORRECT_REBAR]: {
    phase: "correccion",
    label: "Corregir armadura",
    description: "Reajusta la parrilla a la separación del proyecto.",
    icon: "tools",
    tone: "primary",
  },
  [ACTION_TYPES.REINSPECT]: {
    phase: "reinspeccion",
    label: "Reinspeccionar",
    description: "Repite las mediciones y cierra la incidencia.",
    icon: "check",
    tone: "primary",
  },
  [ACTION_TYPES.REVIEW_WEATHER]: {
    phase: "clima",
    label: "Evaluar y reprogramar",
    description: "Mueve el vertido a la ventana seca de las 14:30.",
    icon: "weather",
    tone: "primary",
  },
  [ACTION_TYPES.RISK_POUR_IN_RAIN]: {
    phase: "clima",
    label: "Mantener las 11:00",
    description: "Intento no conforme: la producción quedará bloqueada.",
    icon: "warning",
    tone: "danger",
  },
  [ACTION_TYPES.AUTHORISE_POUR]: {
    phase: "vertido",
    label: "Autorizar y hormigonar",
    description: "Controla el lote H-2407 y completa el vertido trazado.",
    icon: "concrete",
    tone: "primary",
  },
  [ACTION_TYPES.COMPLETE_CURING]: {
    phase: "curado",
    label: "Completar control de curado",
    description: "Aplica protección y registra las primeras 24 horas.",
    icon: "droplet",
    tone: "primary",
  },
  [ACTION_TYPES.CLOSE_REPORT]: {
    phase: "debrief",
    label: "Firmar informe",
    description: "Cierra la misión y consolida XP, reputación y trazabilidad.",
    icon: "report",
    tone: "primary",
  },
  [ACTION_TYPES.SET_HUD_VISIBILITY]: { phase: "*", label: "Visibilidad del HUD", uiOnly: true },
  [ACTION_TYPES.TOGGLE_HUD]: { phase: "*", label: "Alternar HUD", uiOnly: true },
  [ACTION_TYPES.SET_TABLET_OPEN]: { phase: "*", label: "Tablet", uiOnly: true },
  [ACTION_TYPES.SET_ACTIVE_PANEL]: { phase: "*", label: "Panel activo", uiOnly: true },
  [ACTION_TYPES.DISMISS_MESSAGE]: { phase: "*", label: "Cerrar aviso", uiOnly: true },
});

export const RANKS = Object.freeze([
  { id: "ayudante", label: "Ayudante de obra", minXp: 0, maxXp: 599, level: 1 },
  { id: "auxiliar", label: "Auxiliar técnico", minXp: 600, maxXp: 1499, level: 2 },
  { id: "encargado", label: "Encargado de cimentación", minXp: 1500, maxXp: 2999, level: 3 },
  { id: "produccion", label: "Jefe de producción", minXp: 3000, maxXp: 4999, level: 4 },
  { id: "jefe_obra", label: "Jefe de obra", minXp: 5000, maxXp: null, level: 5 },
]);

/**
 * Contextual rules for the fictional OR-27 project. Numeric acceptance values
 * are explicitly project prescriptions, not universal regulatory values.
 */
export const TECHNICAL_RULES = Object.freeze([
  {
    id: "OR27-C101-SEP-Z04",
    version: "1.2",
    category: "proyecto",
    title: "Separación de armadura inferior Z-04",
    requirement: "Barras Ø16 cada 200 mm; tolerancia de control del proyecto ±10 mm.",
    source: "Proyecto ficticio OR-27 · Plano C-101 · Rev. 3",
    effectiveOn: "2026-06-15",
    reviewedOn: "2026-07-01",
    appliesTo: ["Z-04"],
    educational: true,
  },
  {
    id: "OR27-CC-REC-Z04",
    version: "1.1",
    category: "proyecto",
    title: "Recubrimiento nominal Z-04",
    requirement: "Recubrimiento nominal 75 mm según el proyecto ficticio y sus condiciones de exposición.",
    source: "Proyecto ficticio OR-27 · Cuadro de cimentación · Rev. 2",
    effectiveOn: "2026-06-15",
    reviewedOn: "2026-07-01",
    appliesTo: ["Z-04"],
    educational: true,
  },
  {
    id: "OR27-C101-COTA-Z04",
    version: "1.0",
    category: "proyecto",
    title: "Cota superior de zapata Z-04",
    requirement: "Cota de control −1,50 m; tolerancia de inspección del proyecto ±20 mm.",
    source: "Proyecto ficticio OR-27 · Plano C-101 · Rev. 3",
    effectiveOn: "2026-06-15",
    reviewedOn: "2026-07-01",
    appliesTo: ["Z-04"],
    educational: true,
  },
  {
    id: "CE-PARADA-PREVIA-01",
    version: "2021.1-didactica",
    category: "normativa",
    title: "Control previo al hormigonado",
    requirement: "No se libera el vertido hasta comprobar armadura, recubrimiento, encofrado, limpieza y documentación.",
    source: "Código Estructural · síntesis didáctica contextualizada",
    effectiveOn: "2021-11-10",
    reviewedOn: "2026-07-01",
    appliesTo: ["hormigon_armado"],
    educational: true,
  },
  {
    id: "OR27-PC-HM-07",
    version: "2.0",
    category: "proyecto",
    title: "Recepción del lote H-2407",
    requirement: "Verificar albarán, tiempo de transporte, identificación, consistencia prevista y toma de muestras del plan de control.",
    source: "Proyecto ficticio OR-27 · Plan de control PC-01 · Rev. 2",
    effectiveOn: "2026-06-20",
    reviewedOn: "2026-07-01",
    appliesTo: ["Z-04", "H-2407"],
    educational: true,
  },
  {
    id: "OR27-PRL-METEO-03",
    version: "1.0",
    category: "prevencion",
    title: "Reevaluación por lluvia y accesos",
    requirement: "Reevaluar accesos, protección del tajo, escorrentía y capacidad de ejecución antes de mantener el vertido.",
    source: "Plan de Seguridad y Salud ficticio OR-27 · Procedimiento PS-03",
    effectiveOn: "2026-06-20",
    reviewedOn: "2026-07-01",
    appliesTo: ["hormigonado", "accesos"],
    educational: true,
  },
]);

export const CREW_DEFINITIONS = Object.freeze([
  {
    id: "ferralla-norte",
    label: "Ferralla Norte",
    trade: "Ferralla",
    members: 3,
    competency: 94,
    hourlyCost: 138,
    status: "available",
  },
  {
    id: "encofrados-levante",
    label: "Encofrados Levante",
    trade: "Encofrado",
    members: 2,
    competency: 89,
    hourlyCost: 112,
    status: "allocated",
  },
  {
    id: "hormigonado-centro",
    label: "Hormigonado Centro",
    trade: "Hormigón",
    members: 4,
    competency: 92,
    hourlyCost: 176,
    status: "reserved",
  },
]);

export const DIALOGUES = Object.freeze({
  briefing: {
    speaker: "Marta Salas",
    role: "Jefa de obra",
    text: "La Z-04 es hoy nuestro punto crítico. Primero documentación; después, cualquier decisión debe quedar trazada.",
  },
  planos: {
    speaker: "Diego Martín",
    role: "Ingeniero de estructuras",
    text: "No memorices un valor aislado: comprueba qué exige este proyecto, con qué revisión y para qué elemento.",
  },
  cuadrilla: {
    speaker: "Iván Ruiz",
    role: "Capataz",
    text: "Ferralla Norte conoce el tajo. Confirma medios, charla previa y que nadie trabaje sobre una orden ambigua.",
  },
  inspeccion: {
    speaker: "Lucía Torres",
    role: "Técnica de calidad",
    text: "Escanea toda la parrilla. Una foto ayuda, pero la aceptación necesita mediciones identificadas.",
  },
  correccion: {
    speaker: "Iván Ruiz",
    role: "Capataz",
    text: "Tenemos 270 milímetros donde el plano marca 200. Paro el frente y reajustamos antes de seguir.",
  },
  reinspeccion: {
    speaker: "Lucía Torres",
    role: "Técnica de calidad",
    text: "La reparación no cierra sola la incidencia. Repite el control y adjunta la evidencia final.",
  },
  clima: {
    speaker: "Nuria Vega",
    role: "Prevencionista",
    text: "El frente entra a las 10:40. La decisión depende de accesos, protección y continuidad, no solo del icono de lluvia.",
  },
  vertido: {
    speaker: "Sergio Cano",
    role: "Técnico de hormigón",
    text: "Lote H-2407 en obra. Contrasta el albarán y no autorices hasta completar el punto de parada.",
  },
  curado: {
    speaker: "Iván Ruiz",
    role: "Capataz",
    text: "El vertido terminó, pero el trabajo no. Protegemos, señalizamos y dejamos registro del curado.",
  },
  debrief: {
    speaker: "Marta Salas",
    role: "Jefa de obra",
    text: "Buen cierre: detectaste, corregiste y verificaste. Revisa ahora si cada decisión puede reconstruirse desde el informe.",
  },
});

const REWARDS = Object.freeze({
  [ACTION_TYPES.START_BRIEFING]: { xp: 40, reputation: 2, budget: 0 },
  [ACTION_TYPES.REVIEW_PLANS]: { xp: 80, reputation: 3, budget: 0 },
  [ACTION_TYPES.ASSIGN_CREW]: { xp: 70, reputation: 2, budget: -420 },
  [ACTION_TYPES.SCAN_FOUNDATION]: { xp: 130, reputation: 5, budget: -90 },
  [ACTION_TYPES.CORRECT_REBAR]: { xp: 150, reputation: 6, budget: -680 },
  [ACTION_TYPES.REINSPECT]: { xp: 160, reputation: 8, budget: -75 },
  [ACTION_TYPES.REVIEW_WEATHER]: { xp: 120, reputation: 7, budget: -240 },
  [ACTION_TYPES.AUTHORISE_POUR]: { xp: 220, reputation: 9, budget: -4200 },
  [ACTION_TYPES.COMPLETE_CURING]: { xp: 140, reputation: 7, budget: -310 },
  [ACTION_TYPES.CLOSE_REPORT]: { xp: 190, reputation: 11, budget: 750 },
  [ACTION_TYPES.RISK_POUR_IN_RAIN]: { xp: 0, reputation: -8, budget: -180 },
});

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix = "evt") {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function clone(value) {
  if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getRankForXp(xp) {
  return RANKS.findLast?.((rank) => xp >= rank.minXp)
    || [...RANKS].reverse().find((rank) => xp >= rank.minXp)
    || RANKS[0];
}

function makeMessage(type, title, text, meta = {}) {
  return {
    id: makeId("msg"),
    type,
    title,
    text,
    message: text,
    createdAt: nowIso(),
    read: false,
    ...meta,
  };
}

function makeAudit(action, outcome, details = {}) {
  return {
    id: makeId("audit"),
    at: nowIso(),
    action,
    outcome,
    ...details,
  };
}

function makeEvidence(type, title, value, ruleId = null) {
  return {
    id: makeId("evidence"),
    type,
    title,
    value,
    ruleId,
    capturedAt: nowIso(),
    verified: true,
  };
}

export function createInitialState(options = {}) {
  const createdAt = nowIso();
  const initialXp = Number.isFinite(options.initialXp) ? Math.max(0, options.initialXp) : 520;
  const rank = getRankForXp(initialXp);

  const state = {
    schemaVersion: SAVE_VERSION,
    sessionId: options.sessionId || makeId("session"),
    revision: 0,
    createdAt,
    updatedAt: createdAt,
    locale: "es-ES",
    phase: "briefing",
    phaseIndex: 0,
    mission: {
      id: "VS-Z04-01",
      title: "Punto de parada: zapata Z-04",
      subtitle: "Vertical slice · Jornada 07",
      status: "active",
      startedAt: createdAt,
      completedAt: null,
      estimatedMinutes: 28,
      score: 0,
      grade: null,
      disclaimer: "Simulación formativa. No sustituye el proyecto, la dirección facultativa ni formación habilitante.",
    },
    profile: {
      name: options.playerName || "Alex Romero",
      xp: initialXp,
      rankId: rank.id,
      rankLabel: rank.label,
      level: rank.level,
      reputation: 72,
      budget: 18450,
      initialBudget: 18450,
      completedMissions: 2,
      unsafeDecisions: 0,
      achievements: [],
    },
    project: {
      id: "OR-27",
      name: "Residencial Mirador Norte",
      fictional: true,
      revision: "2026.07-R3",
      documents: [
        { id: "C-101", label: "Plano de cimentación C-101", revision: "3", reviewed: false },
        { id: "GEO-02", label: "Informe geotécnico GEO-02", revision: "2", reviewed: false },
        { id: "PC-01", label: "Plan de control PC-01", revision: "2", reviewed: false },
      ],
      sourceHierarchy: ["normativa", "proyecto", "procedimiento", "recomendacion"],
    },
    workPackage: {
      id: "PAQ-Z04",
      title: "Ejecución y control de zapata Z-04",
      status: "briefing",
      approval: "pending",
      percent: 0,
      dependencies: [
        { id: "replanteo", label: "Replanteo topográfico", status: "complete" },
        { id: "limpieza", label: "Hormigón de limpieza", status: "complete" },
        { id: "armadura", label: "Armadura y separadores", status: "inspection_pending" },
        { id: "weather", label: "Ventana meteorológica", status: "pending" },
      ],
      assignedCrewId: null,
      holdPointReleasedAt: null,
    },
    element: {
      id: "Z-04",
      type: "zapata_aislada",
      dimensionsM: { length: 3.8, width: 3.2, depth: 0.85 },
      design: {
        rebar: "Ø16 / 200 mm",
        spacingMm: 200,
        spacingToleranceMm: 10,
        nominalCoverMm: 75,
        inspectionCoverToleranceMm: 10,
        topElevationM: -1.5,
        elevationToleranceM: 0.02,
        concrete: "HA-30/F/20/XC2",
        volumeM3: 10.34,
      },
      asBuilt: {
        spacingMm: 270,
        coverMm: 74,
        topElevationM: -1.492,
        cleanliness: "conforme",
        formwork: "conforme",
        concreteStatus: "not_poured",
      },
      visualState: "rebar_ready",
    },
    crews: CREW_DEFINITIONS.map((crew) => ({ ...crew })),
    inspection: {
      status: "pending",
      progress: 0,
      checklist: {
        replanteo: { label: "Replanteo", status: "verified", value: "Ejes A/4 conformes" },
        armadura: { label: "Armadura", status: "pending", value: null },
        recubrimiento: { label: "Recubrimiento", status: "pending", value: null },
        encofrado: { label: "Encofrado", status: "pending", value: null },
        nivel: { label: "Nivel", status: "pending", value: null },
      },
      findings: [],
      evidence: [],
      scanCompletedAt: null,
      reinspectionCompletedAt: null,
    },
    incidents: [
      {
        id: "INC-Z04-001",
        title: "Separación irregular de armadura",
        description: "Lectura latente de 270 mm en el paño noreste frente a 200 ±10 mm del proyecto.",
        status: "latent",
        severity: "high",
        ruleId: "OR27-C101-SEP-Z04",
        detectedAt: null,
        correctedAt: null,
        closedAt: null,
        cost: 0,
      },
    ],
    weather: {
      reviewed: false,
      current: { condition: "despejado", temperatureC: 24, windKph: 9, precipitationMm: 0 },
      forecast: {
        condition: "lluvia_moderada",
        startsAt: "10:40",
        endsAt: "12:35",
        precipitationMm: 7.2,
        confidence: 0.88,
      },
      pourSlot: "11:00",
      safeWindow: "14:30",
      rescheduled: false,
      unsafeAttempted: false,
      impact: "Acceso de cubas y protección del hormigón fresco requieren reevaluación.",
    },
    pour: {
      status: "not_authorised",
      authorisedAt: null,
      pouredAt: null,
      batchId: "H-2407",
      truckId: "M-1842-KT",
      ticketVerified: false,
      controlSample: null,
      deliveredM3: 0,
      vibration: "pending",
    },
    curing: {
      status: "pending",
      method: null,
      protected: false,
      startedAt: null,
      firstCheckAt: null,
      elapsedHours: 0,
      temperatureC: null,
      humidityPercent: null,
    },
    report: {
      id: "INF-Z04-PENDING",
      status: "draft",
      signedAt: null,
      evidenceCount: 0,
      findingsResolved: 0,
      traceabilityPercent: 0,
      sections: {
        documentation: false,
        inspection: false,
        correction: false,
        concrete: false,
        curing: false,
      },
    },
    timeline: [
      { id: makeId("tl"), phase: "briefing", label: "Encargo recibido", at: createdAt, status: "active" },
    ],
    progress: {
      completedPhases: [],
      completedActions: [],
      currentObjective: PHASE_DEFINITIONS.briefing.objective,
    },
    flags: {
      briefingAccepted: false,
      plansReviewed: false,
      crewAssigned: false,
      defectDetected: false,
      correctionApplied: false,
      reinspectionPassed: false,
      weatherPlanApproved: false,
      pourComplete: false,
      curingComplete: false,
      reportClosed: false,
    },
    clock: {
      day: 1,
      dayLabel: "Martes · Jornada 07",
      minutes: 8 * 60 + 5,
      display: "08:05",
      timeScale: 1,
    },
    ui: {
      hudVisible: true,
      tabletOpen: false,
      activePanel: "mission",
      selectedRuleId: null,
      reducedMotion: false,
      lastAction: null,
    },
    messages: [
      makeMessage("mission", "Nueva misión", "Dirígete a la caseta técnica y recibe el briefing de la zapata Z-04."),
    ],
    auditTrail: [makeAudit("CREATE_SESSION", "accepted", { phase: "briefing" })],
  };

  return syncCompatibilityAliases(state);
}

function validateStateShape(state) {
  if (!state || typeof state !== "object") return { valid: false, code: "STATE_MISSING", message: "No hay un estado de juego válido." };
  if (state.schemaVersion !== SAVE_VERSION) return { valid: false, code: "VERSION_UNSUPPORTED", message: "La versión de guardado no es compatible." };
  if (!PHASES.includes(state.phase)) return { valid: false, code: "PHASE_INVALID", message: "La fase guardada no existe." };
  if (!state.profile || !Number.isFinite(state.profile.xp) || !Number.isFinite(state.profile.budget)) {
    return { valid: false, code: "PROFILE_INVALID", message: "El perfil de progreso está dañado." };
  }
  if (!state.workPackage || !state.element || !state.inspection) {
    return { valid: false, code: "MISSION_DATA_INVALID", message: "Faltan datos esenciales de la misión." };
  }
  return { valid: true, code: "OK", message: "Estado válido." };
}

export function validateAction(state, action) {
  const stateCheck = validateStateShape(state);
  if (!stateCheck.valid) return stateCheck;

  const normalized = typeof action === "string" ? { type: action } : action;
  if (!normalized || typeof normalized.type !== "string") {
    return { valid: false, code: "ACTION_MISSING", message: "La acción no tiene un tipo válido." };
  }

  const definition = ACTION_CATALOG[normalized.type];
  if (!definition) return { valid: false, code: "ACTION_UNKNOWN", message: `Acción desconocida: ${normalized.type}.` };

  if (definition.uiOnly) {
    if (normalized.type === ACTION_TYPES.SET_HUD_VISIBILITY && typeof normalized.visible !== "boolean") {
      return { valid: false, code: "VALUE_INVALID", message: "La visibilidad del HUD debe ser booleana." };
    }
    if (normalized.type === ACTION_TYPES.SET_TABLET_OPEN && typeof normalized.open !== "boolean") {
      return { valid: false, code: "VALUE_INVALID", message: "El estado de la tablet debe ser booleano." };
    }
    return { valid: true, code: "OK", message: "Acción disponible.", action: normalized };
  }

  if (state.mission.status === "completed") {
    return { valid: false, code: "MISSION_COMPLETED", message: "La misión ya está cerrada." };
  }
  if (definition.phase !== state.phase) {
    return {
      valid: false,
      code: "WRONG_PHASE",
      message: `Esta acción pertenece a ${PHASE_DEFINITIONS[definition.phase]?.label || definition.phase}.`,
    };
  }
  if (state.progress.completedActions.includes(normalized.type) && normalized.type !== ACTION_TYPES.RISK_POUR_IN_RAIN) {
    return { valid: false, code: "ACTION_ALREADY_COMPLETED", message: "Esta acción ya consta como completada." };
  }

  switch (normalized.type) {
    case ACTION_TYPES.ASSIGN_CREW: {
      const crewId = normalized.crewId || "ferralla-norte";
      const crew = state.crews.find((item) => item.id === crewId);
      if (!state.flags.plansReviewed) return { valid: false, code: "PLANS_REQUIRED", message: "Debes revisar los planos antes de asignar el trabajo." };
      if (!crew || crew.trade !== "Ferralla" || !["available", "assigned"].includes(crew.status)) {
        return { valid: false, code: "CREW_UNAVAILABLE", message: "Selecciona una cuadrilla de ferralla disponible." };
      }
      break;
    }
    case ACTION_TYPES.SCAN_FOUNDATION:
      if (!state.flags.crewAssigned) return { valid: false, code: "CREW_REQUIRED", message: "No hay una cuadrilla responsable asignada." };
      break;
    case ACTION_TYPES.CORRECT_REBAR:
      if (state.incidents[0]?.status !== "open") return { valid: false, code: "INCIDENT_NOT_OPEN", message: "No existe una incidencia abierta que corregir." };
      break;
    case ACTION_TYPES.REINSPECT:
      if (!state.flags.correctionApplied) return { valid: false, code: "CORRECTION_REQUIRED", message: "Primero debe ejecutarse y documentarse la corrección." };
      break;
    case ACTION_TYPES.REVIEW_WEATHER:
      if (!state.flags.reinspectionPassed) return { valid: false, code: "HOLD_POINT_BLOCKED", message: "La reinspección aún no ha liberado el punto de parada." };
      break;
    case ACTION_TYPES.RISK_POUR_IN_RAIN:
      if (state.weather.unsafeAttempted) return { valid: false, code: "RISK_ALREADY_REJECTED", message: "El intento ya fue rechazado; revisa la alternativa segura." };
      break;
    case ACTION_TYPES.AUTHORISE_POUR:
      if (!state.flags.weatherPlanApproved || !state.weather.rescheduled) {
        return { valid: false, code: "WEATHER_PLAN_REQUIRED", message: "No existe una ventana meteorológica aprobada." };
      }
      if (state.workPackage.approval !== "released") {
        return { valid: false, code: "HOLD_POINT_BLOCKED", message: "El punto de parada no está liberado." };
      }
      break;
    case ACTION_TYPES.COMPLETE_CURING:
      if (!state.flags.pourComplete) return { valid: false, code: "POUR_REQUIRED", message: "No puede iniciarse el curado antes del vertido." };
      break;
    case ACTION_TYPES.CLOSE_REPORT:
      if (!state.flags.curingComplete) return { valid: false, code: "CURING_REQUIRED", message: "Falta completar el registro de curado." };
      break;
    default:
      break;
  }

  return { valid: true, code: "OK", message: "Acción disponible.", action: normalized };
}

function setClock(state, minutes, day = state.clock.day) {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalised / 60).toString().padStart(2, "0");
  const mins = (normalised % 60).toString().padStart(2, "0");
  state.clock.minutes = normalised;
  state.clock.day = day;
  state.clock.display = `${hours}:${mins}`;
}

function addMessage(state, message) {
  state.messages = [message, ...state.messages].slice(0, 10);
}

function applyReward(state, actionType) {
  const reward = REWARDS[actionType] || { xp: 0, reputation: 0, budget: 0 };
  const previousRank = state.profile.rankId;
  state.profile.xp = Math.max(0, state.profile.xp + reward.xp);
  state.profile.reputation = clamp(state.profile.reputation + reward.reputation, 0, 100);
  state.profile.budget = Math.max(0, Math.round(state.profile.budget + reward.budget));
  state.mission.score += Math.max(0, reward.xp + reward.reputation * 10);

  const rank = getRankForXp(state.profile.xp);
  state.profile.rankId = rank.id;
  state.profile.rankLabel = rank.label;
  state.profile.level = rank.level;
  if (rank.id !== previousRank) {
    addMessage(state, makeMessage("rank", "Nuevo rango", `Has alcanzado el rango ${rank.label}.`));
  }
  return reward;
}

function advancePhase(state, completedAction) {
  const currentPhase = state.phase;
  const currentIndex = PHASES.indexOf(currentPhase);
  if (!state.progress.completedPhases.includes(currentPhase)) state.progress.completedPhases.push(currentPhase);
  if (!state.progress.completedActions.includes(completedAction)) state.progress.completedActions.push(completedAction);

  const timelineCurrent = state.timeline.findLast?.((item) => item.phase === currentPhase)
    || [...state.timeline].reverse().find((item) => item.phase === currentPhase);
  if (timelineCurrent) timelineCurrent.status = "complete";

  if (currentIndex < PHASES.length - 1) {
    const nextPhase = PHASES[currentIndex + 1];
    state.phase = nextPhase;
    state.phaseIndex = currentIndex + 1;
    state.progress.currentObjective = PHASE_DEFINITIONS[nextPhase].objective;
    state.timeline.push({
      id: makeId("tl"),
      phase: nextPhase,
      label: PHASE_DEFINITIONS[nextPhase].label,
      at: nowIso(),
      status: "active",
    });
  }
}

function completeStandardAction(state, actionType, successMessage) {
  const reward = applyReward(state, actionType);
  advancePhase(state, actionType);
  addMessage(state, makeMessage("success", successMessage.title, successMessage.text, { reward }));
  return reward;
}

// A compact compatibility surface keeps the renderer simple while the source
// of truth remains in the explicit domain objects above.
function syncCompatibilityAliases(state) {
  state.xp = state.profile.xp;
  state.level = state.profile.level;
  state.rank = state.profile.rankLabel;
  state.planReviewed = state.flags.plansReviewed;
  state.crewAssigned = state.flags.crewAssigned;
  state.defectDetected = state.flags.defectDetected;
  state.defectCorrected = state.flags.correctionApplied;
  state.incidentStatus = state.incidents[0]?.status || "none";
  state.weatherReviewed = state.flags.weatherPlanApproved;
  state.pourAuthorised = state.flags.pourComplete;
  state.observedSpacingMm = state.element.asBuilt.spacingMm;
  state.completed = state.mission.status === "completed";
  return state;
}

function handleGameplayAction(state, action) {
  switch (action.type) {
    case ACTION_TYPES.START_BRIEFING: {
      state.flags.briefingAccepted = true;
      state.workPackage.status = "documentation_review";
      state.workPackage.percent = 7;
      state.report.sections.documentation = false;
      setClock(state, 8 * 60 + 20);
      completeStandardAction(state, action.type, {
        title: "Briefing completado",
        text: "Encargo, EPI, circulación y punto de reunión confirmados.",
      });
      break;
    }
    case ACTION_TYPES.REVIEW_PLANS: {
      state.project.documents.forEach((document) => { document.reviewed = true; });
      state.flags.plansReviewed = true;
      state.workPackage.status = "resource_planning";
      state.workPackage.percent = 16;
      state.report.sections.documentation = true;
      state.inspection.evidence.push(
        makeEvidence("document", "Plano C-101 Rev. 3 revisado", "Z-04 · Ø16/200 · cota −1,50 m", "OR27-C101-SEP-Z04"),
      );
      setClock(state, 8 * 60 + 42);
      completeStandardAction(state, action.type, {
        title: "Fuente de verdad fijada",
        text: "Las prescripciones del proyecto ficticio quedan vinculadas a la inspección.",
      });
      break;
    }
    case ACTION_TYPES.ASSIGN_CREW: {
      const crewId = action.crewId || "ferralla-norte";
      state.crews = state.crews.map((crew) => crew.id === crewId
        ? { ...crew, status: "assigned", task: "Corrección y apoyo a inspección Z-04", briefingComplete: true }
        : crew);
      state.workPackage.assignedCrewId = crewId;
      state.workPackage.status = "inspection_pending";
      state.workPackage.percent = 24;
      state.flags.crewAssigned = true;
      setClock(state, 9 * 60 + 5);
      completeStandardAction(state, action.type, {
        title: "Cuadrilla movilizada",
        text: "Ferralla Norte ha recibido la orden, los medios y la charla de tarea.",
      });
      break;
    }
    case ACTION_TYPES.SCAN_FOUNDATION: {
      const incident = state.incidents[0];
      incident.status = "open";
      incident.detectedAt = nowIso();
      state.flags.defectDetected = true;
      state.inspection.status = "blocked";
      state.inspection.progress = 80;
      state.inspection.scanCompletedAt = nowIso();
      state.inspection.checklist.armadura = { label: "Armadura", status: "nonconforming", value: "270 mm · paño NE" };
      state.inspection.checklist.recubrimiento = { label: "Recubrimiento", status: "verified", value: "74 mm" };
      state.inspection.checklist.encofrado = { label: "Encofrado", status: "verified", value: "Conforme" };
      state.inspection.checklist.nivel = { label: "Nivel", status: "verified", value: "−1,492 m" };
      state.inspection.findings = [
        { id: "F-Z04-SEP", label: "Separación paño NE", measured: 270, expected: 200, unit: "mm", status: "nonconforming", ruleId: incident.ruleId },
        { id: "F-Z04-REC", label: "Recubrimiento", measured: 74, expected: 75, unit: "mm", status: "conforming", ruleId: "OR27-CC-REC-Z04" },
        { id: "F-Z04-COTA", label: "Cota superior", measured: -1.492, expected: -1.5, unit: "m", status: "conforming", ruleId: "OR27-C101-COTA-Z04" },
      ];
      state.inspection.evidence.push(
        makeEvidence("scan", "Nube de puntos Z-04", "Separación máxima detectada: 270 mm", incident.ruleId),
        makeEvidence("measurement", "Control de recubrimiento", "74 mm · conforme al criterio del proyecto", "OR27-CC-REC-Z04"),
        makeEvidence("measurement", "Control de cota", "−1,492 m · conforme al criterio del proyecto", "OR27-C101-COTA-Z04"),
      );
      state.workPackage.status = "blocked_by_incident";
      state.workPackage.approval = "blocked";
      state.workPackage.percent = 36;
      setClock(state, 9 * 60 + 38);
      completeStandardAction(state, action.type, {
        title: "Punto de parada bloqueado",
        text: "Incidencia INC-Z04-001: separación de 270 mm fuera de la prescripción del proyecto.",
      });
      break;
    }
    case ACTION_TYPES.CORRECT_REBAR: {
      const incident = state.incidents[0];
      state.element.asBuilt.spacingMm = 200;
      state.element.visualState = "rebar_corrected";
      incident.status = "corrected_pending_verification";
      incident.correctedAt = nowIso();
      incident.cost = 680;
      state.flags.correctionApplied = true;
      state.inspection.checklist.armadura = { label: "Armadura", status: "recheck", value: "Reajustada a 200 mm" };
      state.inspection.evidence.push(
        makeEvidence("photo", "Corrección ejecutada", "Parrilla reajustada y calzada; pendiente de reinspección", incident.ruleId),
      );
      state.workPackage.status = "reinspection_pending";
      state.workPackage.percent = 48;
      setClock(state, 10 * 60 + 8);
      completeStandardAction(state, action.type, {
        title: "Corrección documentada",
        text: "La parrilla se ha reajustado a 200 mm. La incidencia sigue abierta hasta reinspeccionar.",
      });
      break;
    }
    case ACTION_TYPES.REINSPECT: {
      const incident = state.incidents[0];
      incident.status = "closed";
      incident.closedAt = nowIso();
      state.flags.reinspectionPassed = true;
      state.inspection.status = "approved";
      state.inspection.progress = 100;
      state.inspection.reinspectionCompletedAt = nowIso();
      state.inspection.checklist.armadura = { label: "Armadura", status: "verified", value: "200 mm · conforme" };
      const spacingFinding = state.inspection.findings.find((finding) => finding.id === "F-Z04-SEP");
      if (spacingFinding) {
        spacingFinding.measured = 200;
        spacingFinding.status = "corrected";
        spacingFinding.reinspection = true;
      }
      state.inspection.evidence.push(
        makeEvidence("measurement", "Reinspección de armadura", "200 mm · incidencia cerrada", incident.ruleId),
      );
      state.workPackage.status = "weather_review";
      state.workPackage.approval = "technically_conforming";
      state.workPackage.percent = 60;
      state.report.sections.inspection = true;
      state.report.sections.correction = true;
      setClock(state, 10 * 60 + 32);
      completeStandardAction(state, action.type, {
        title: "Reinspección conforme",
        text: "La incidencia queda cerrada con medición final y trazabilidad completa.",
      });
      break;
    }
    case ACTION_TYPES.RISK_POUR_IN_RAIN: {
      state.weather.unsafeAttempted = true;
      state.profile.unsafeDecisions += 1;
      state.workPackage.status = "weather_decision_rejected";
      const reward = applyReward(state, action.type);
      state.auditTrail.push(makeAudit(action.type, "rejected_safe", { phase: state.phase, reward }));
      addMessage(state, makeMessage(
        "danger",
        "Decisión rechazada",
        "El vertido no se autoriza: la ventana de las 11:00 compromete accesos y continuidad. Reprograma con el equipo.",
        { reward },
      ));
      break;
    }
    case ACTION_TYPES.REVIEW_WEATHER: {
      state.weather.reviewed = true;
      state.weather.rescheduled = true;
      state.weather.pourSlot = state.weather.safeWindow;
      state.weather.current = { condition: "nublado_seco", temperatureC: 21, windKph: 11, precipitationMm: 0 };
      state.flags.weatherPlanApproved = true;
      state.workPackage.status = "ready_to_pour";
      state.workPackage.approval = "released";
      state.workPackage.holdPointReleasedAt = nowIso();
      state.workPackage.percent = 70;
      const weatherDependency = state.workPackage.dependencies.find((dependency) => dependency.id === "weather");
      if (weatherDependency) weatherDependency.status = "complete";
      state.inspection.evidence.push(
        makeEvidence("weather", "Reprogramación de vertido", "De 11:00 a 14:30 · ventana seca aprobada", "OR27-PRL-METEO-03"),
      );
      setClock(state, 13 * 60 + 55);
      completeStandardAction(state, action.type, {
        title: "Ventana segura aprobada",
        text: "Suministro, accesos y protección se han reprogramado para las 14:30.",
      });
      break;
    }
    case ACTION_TYPES.AUTHORISE_POUR: {
      state.pour.status = "completed";
      state.pour.authorisedAt = nowIso();
      state.pour.pouredAt = nowIso();
      state.pour.ticketVerified = true;
      state.pour.controlSample = "M-2407-A/B/C";
      state.pour.deliveredM3 = 10.4;
      state.pour.vibration = "logged_conforming";
      state.element.asBuilt.concreteStatus = "fresh_protected";
      state.element.visualState = "fresh_concrete";
      state.flags.pourComplete = true;
      state.workPackage.status = "curing_required";
      state.workPackage.percent = 84;
      state.report.sections.concrete = true;
      state.inspection.evidence.push(
        makeEvidence("delivery", "Albarán lote H-2407", "10,4 m³ · cuba M-1842-KT · verificado", "OR27-PC-HM-07"),
        makeEvidence("sample", "Muestras de control", "Serie M-2407-A/B/C", "OR27-PC-HM-07"),
        makeEvidence("process", "Registro de vibrado", "Secuencia completa · sin incidencias", "OR27-PC-HM-07"),
      );
      setClock(state, 16 * 60 + 5);
      completeStandardAction(state, action.type, {
        title: "Vertido completado",
        text: "Lote H-2407 recibido, trazado y ejecutado. Comienza la protección temprana.",
      });
      break;
    }
    case ACTION_TYPES.COMPLETE_CURING: {
      state.curing.status = "first_cycle_complete";
      state.curing.method = "membrana_de_curado_y_lamina_protectora";
      state.curing.protected = true;
      state.curing.startedAt = nowIso();
      state.curing.firstCheckAt = nowIso();
      state.curing.elapsedHours = 24;
      state.curing.temperatureC = 20;
      state.curing.humidityPercent = 86;
      state.element.asBuilt.concreteStatus = "curing_24h";
      state.element.visualState = "curing_protected";
      state.flags.curingComplete = true;
      state.workPackage.status = "quality_report_pending";
      state.workPackage.percent = 94;
      state.report.sections.curing = true;
      state.inspection.evidence.push(
        makeEvidence("curing", "Primer control de curado", "24 h · 20 °C · HR 86 % · protección íntegra"),
      );
      setClock(state, 16 * 60 + 20, 2);
      state.clock.dayLabel = "Miércoles · Jornada 08";
      completeStandardAction(state, action.type, {
        title: "Curado controlado",
        text: "Protección íntegra y primer ciclo de 24 horas registrado.",
      });
      break;
    }
    case ACTION_TYPES.CLOSE_REPORT: {
      const allEvidence = state.inspection.evidence.length;
      const closedIncidents = state.incidents.filter((incident) => incident.status === "closed").length;
      state.report.id = "INF-Z04-2026-007";
      state.report.status = "signed";
      state.report.signedAt = nowIso();
      state.report.evidenceCount = allEvidence;
      state.report.findingsResolved = closedIncidents;
      state.report.traceabilityPercent = 100;
      state.report.sections = Object.fromEntries(Object.keys(state.report.sections).map((key) => [key, true]));
      state.flags.reportClosed = true;
      state.workPackage.status = "complete";
      state.workPackage.approval = "accepted";
      state.workPackage.percent = 100;
      state.element.asBuilt.concreteStatus = "accepted_internal_training";
      const reward = applyReward(state, action.type);
      if (!state.progress.completedPhases.includes("debrief")) state.progress.completedPhases.push("debrief");
      if (!state.progress.completedActions.includes(action.type)) state.progress.completedActions.push(action.type);
      const timelineCurrent = state.timeline.findLast?.((item) => item.phase === "debrief")
        || [...state.timeline].reverse().find((item) => item.phase === "debrief");
      if (timelineCurrent) timelineCurrent.status = "complete";
      state.mission.status = "completed";
      state.mission.completedAt = nowIso();
      state.mission.grade = state.profile.unsafeDecisions === 0 ? "S" : "A";
      state.profile.completedMissions += 1;
      if (state.profile.unsafeDecisions === 0) state.profile.achievements.push("Trazabilidad impecable");
      state.profile.achievements.push("Punto de parada Z-04");
      addMessage(state, makeMessage(
        "missionComplete",
        `Misión completada · Rango ${state.mission.grade}`,
        `Informe ${state.report.id} firmado con ${allEvidence} evidencias y ${closedIncidents} incidencia resuelta.`,
        { reward },
      ));
      break;
    }
    default:
      break;
  }
}

function handleUiAction(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_HUD_VISIBILITY:
      state.ui.hudVisible = action.visible;
      break;
    case ACTION_TYPES.TOGGLE_HUD:
      state.ui.hudVisible = !state.ui.hudVisible;
      break;
    case ACTION_TYPES.SET_TABLET_OPEN:
      state.ui.tabletOpen = action.open;
      break;
    case ACTION_TYPES.SET_ACTIVE_PANEL:
      state.ui.activePanel = typeof action.panel === "string" ? action.panel : null;
      break;
    case ACTION_TYPES.DISMISS_MESSAGE:
      state.messages = action.id
        ? state.messages.filter((message) => message.id !== action.id)
        : state.messages.slice(1);
      break;
    default:
      break;
  }
}

/**
 * Applies one action without mutating the input. The returned object is useful
 * for imperative UIs; `gameReducer` below returns only its `state` member.
 */
export function applyAction(currentState, inputAction, options = {}) {
  const action = typeof inputAction === "string" ? { type: inputAction } : { ...inputAction };
  const validation = validateAction(currentState, action);

  if (!validation.valid) {
    if (options.recordRejected === false || !validateStateShape(currentState).valid) {
      return { ok: false, state: currentState, error: validation.message, validation, events: [] };
    }
    const rejected = clone(currentState);
    rejected.revision += 1;
    rejected.updatedAt = nowIso();
    rejected.auditTrail = [...(rejected.auditTrail || []), makeAudit(action?.type || "UNKNOWN", "rejected", {
      phase: rejected.phase,
      code: validation.code,
    })].slice(-150);
    addMessage(rejected, makeMessage("warning", "Acción no disponible", validation.message));
    return { ok: false, state: rejected, error: validation.message, validation, events: rejected.messages.slice(0, 1) };
  }

  const next = clone(currentState);
  const definition = ACTION_CATALOG[action.type];
  if (definition.uiOnly) handleUiAction(next, action);
  else handleGameplayAction(next, action);

  // Convenience patch used by the 3D controller when an action also closes or
  // opens the in-world tablet.
  if (typeof action.tabletOpen === "boolean") next.ui.tabletOpen = action.tabletOpen;
  if (typeof action.activePanel === "string") next.ui.activePanel = action.activePanel;

  next.ui.lastAction = action.type;
  syncCompatibilityAliases(next);
  next.phaseIndex = PHASES.indexOf(next.phase);
  next.revision += 1;
  next.updatedAt = nowIso();
  next.auditTrail = [...next.auditTrail, makeAudit(action.type, "accepted", {
    fromPhase: currentState.phase,
    toPhase: next.phase,
    revision: next.revision,
  })].slice(-150);

  return {
    ok: true,
    state: next,
    error: null,
    events: next.messages.filter((message) => !currentState.messages.some((old) => old.id === message.id)),
  };
}

export function gameReducer(state = createInitialState(), action) {
  return applyAction(state, action).state;
}

export function getAvailableActions(state, options = {}) {
  const includeDisabled = options.includeDisabled ?? true;
  const phaseActions = Object.entries(ACTION_CATALOG)
    .filter(([, definition]) => !definition.uiOnly && definition.phase === state.phase)
    .map(([type, definition]) => {
      const validation = validateAction(state, { type });
      return {
        type,
        ...definition,
        enabled: validation.valid,
        disabledReason: validation.valid ? null : validation.message,
        recommended: type === MAIN_ACTION_BY_PHASE[state.phase],
      };
    });
  return includeDisabled ? phaseActions : phaseActions.filter((action) => action.enabled);
}

export function getProgressPercent(state) {
  if (state.mission.status === "completed") return 100;
  const base = (PHASES.indexOf(state.phase) / PHASES.length) * 100;
  return Math.round(Math.max(base, state.workPackage?.percent || 0));
}

export function getRankProgress(profileOrState) {
  const profile = profileOrState.profile || profileOrState;
  const rank = getRankForXp(profile.xp);
  const nextRank = RANKS.find((item) => item.minXp > profile.xp) || null;
  const span = nextRank ? nextRank.minXp - rank.minXp : 1;
  const earned = nextRank ? profile.xp - rank.minXp : 1;
  return {
    current: rank,
    next: nextRank,
    xp: profile.xp,
    xpIntoRank: nextRank ? earned : null,
    xpForNext: nextRank ? span : null,
    percent: nextRank ? Math.round(clamp(earned / span, 0, 1) * 100) : 100,
  };
}

export function getUIData(state) {
  const phase = PHASE_DEFINITIONS[state.phase];
  const rankProgress = getRankProgress(state);
  const currentDialogue = DIALOGUES[state.phase];
  const openIncident = state.incidents.find((incident) => !["closed", "latent"].includes(incident.status)) || null;

  const safetyScore = clamp(100 - state.profile.unsafeDecisions * 10, 0, 100);
  const qualityScore = state.flags.reinspectionPassed ? 98 : state.flags.defectDetected ? 74 : 92;
  const nextRankXp = rankProgress.next?.minXp ?? state.profile.xp;
  const checklist = [
    { label: "Replanteo", done: true, warning: false },
    { label: "Documentación del proyecto", done: state.flags.plansReviewed, warning: false },
    { label: "Cuadrilla de ferralla", done: state.flags.crewAssigned, warning: false },
    {
      label: "Armadura y separadores",
      done: state.flags.reinspectionPassed,
      warning: state.flags.defectDetected && !state.flags.reinspectionPassed,
    },
    { label: "Clima y procedimiento", done: state.flags.weatherPlanApproved, warning: false },
    { label: "Autorización de vertido", done: state.flags.pourComplete, warning: false },
  ];
  const uiTimeline = state.timeline.map((item) => ({
    ...item,
    active: item.status === "active",
    done: item.status === "complete",
  }));

  return {
    title: "Cimentaciones: Obra Real",
    mission: {
      ...state.mission,
      progressPercent: getProgressPercent(state),
      phaseNumber: state.phaseIndex + 1,
      phaseCount: PHASES.length,
    },
    phase: { id: state.phase, ...phase },
    objectiveTitle: phase.label,
    objective: phase.objective,
    objectiveCopy: phase.instruction,
    objectiveDetail: {
      title: phase.label,
      text: phase.objective,
      instruction: phase.instruction,
      complete: state.mission.status === "completed",
    },
    profile: {
      ...state.profile,
      rankProgress,
      budgetDelta: state.profile.budget - state.profile.initialBudget,
    },
    grade: state.mission.grade,
    qualityScore,
    safetyScore,
    xp: state.profile.xp,
    level: state.profile.level,
    rank: state.profile.rankLabel,
    nextRankXp,
    xpProgress: rankProgress.percent,
    progress: getProgressPercent(state),
    time: state.clock.display,
    material: Math.max(32, 78 - Math.round(getProgressPercent(state) * 0.32)),
    budget: state.profile.budget,
    risk: openIncident ? "alto" : state.phase === "clima" ? "medio" : "bajo",
    weatherLabel: state.phase === "clima"
      ? "Frente de lluvia · 10:40"
      : state.flags.weatherPlanApproved
        ? "Nublado seco · 21 °C"
        : "Despejado · 24 °C",
    checklist,
    workPackage: clone(state.workPackage),
    element: clone(state.element),
    inspection: {
      ...clone(state.inspection),
      observedSpacingMm: state.element.asBuilt.spacingMm,
      openIncident,
      compliantChecks: Object.values(state.inspection.checklist).filter((check) => check.status === "verified").length,
      totalChecks: Object.keys(state.inspection.checklist).length,
    },
    weather: clone(state.weather),
    pour: clone(state.pour),
    curing: clone(state.curing),
    report: clone(state.report),
    dialogue: clone(currentDialogue),
    actions: getAvailableActions(state),
    rules: TECHNICAL_RULES.map((rule) => ({ ...rule })),
    crews: clone(state.crews),
    clock: clone(state.clock),
    messages: clone(state.messages),
    timeline: uiTimeline,
    ui: clone(state.ui),
    minimap: {
      activeZone: phase.location,
      markers: [
        { id: "player", type: "player", label: "Tú", x: 0.48, y: 0.62 },
        { id: "objective", type: "objective", label: phase.location, x: 0.58, y: 0.43 },
        { id: "z04", type: "foundation", label: "Z-04", x: 0.63, y: 0.37 },
      ],
    },
  };
}

function getStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function mergeSafe(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? clone(incoming) : clone(base);
  if (!base || typeof base !== "object") return incoming === undefined ? base : incoming;
  if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) return clone(base);

  const result = { ...base };
  Object.keys(base).forEach((key) => {
    if (["__proto__", "prototype", "constructor"].includes(key)) return;
    if (Object.prototype.hasOwnProperty.call(incoming, key)) result[key] = mergeSafe(base[key], incoming[key]);
  });
  return result;
}

function hydrateState(savedState) {
  const hydrated = mergeSafe(createInitialState({ sessionId: savedState?.sessionId }), savedState);
  hydrated.schemaVersion = SAVE_VERSION;
  hydrated.phaseIndex = PHASES.indexOf(hydrated.phase);
  const rank = getRankForXp(hydrated.profile.xp);
  hydrated.profile.rankId = rank.id;
  hydrated.profile.rankLabel = rank.label;
  hydrated.profile.level = rank.level;
  return syncCompatibilityAliases(hydrated);
}

export function saveGame(state, storage = null) {
  const validation = validateStateShape(state);
  if (!validation.valid) return { ok: false, code: validation.code, error: validation.message };
  const target = getStorage(storage);
  if (!target?.setItem) return { ok: false, code: "STORAGE_UNAVAILABLE", error: "El almacenamiento local no está disponible." };

  const savedAt = nowIso();
  const envelope = { version: SAVE_VERSION, savedAt, state };
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return { ok: true, code: "SAVED", savedAt, key: STORAGE_KEY };
  } catch (error) {
    return { ok: false, code: "SAVE_FAILED", error: error instanceof Error ? error.message : String(error) };
  }
}

export function loadGameResult(storage = null) {
  const target = getStorage(storage);
  if (!target?.getItem) {
    return { ok: false, code: "STORAGE_UNAVAILABLE", state: null, error: "El almacenamiento local no está disponible." };
  }

  try {
    const raw = target.getItem(STORAGE_KEY);
    if (!raw) return { ok: false, code: "SAVE_NOT_FOUND", state: null, error: "No existe una partida guardada." };
    const envelope = JSON.parse(raw);
    if (!envelope || envelope.version !== SAVE_VERSION || !envelope.state) {
      return { ok: false, code: "VERSION_UNSUPPORTED", state: null, error: "El guardado pertenece a otra versión." };
    }
    const state = hydrateState(envelope.state);
    const validation = validateStateShape(state);
    if (!validation.valid) return { ok: false, code: validation.code, state: null, error: validation.message };
    return { ok: true, code: "LOADED", state, savedAt: envelope.savedAt || null, key: STORAGE_KEY };
  } catch (error) {
    return { ok: false, code: "LOAD_FAILED", state: null, error: error instanceof Error ? error.message : String(error) };
  }
}

export function loadSavedState(storage = null) {
  const result = loadGameResult(storage);
  return result.ok ? result.state : null;
}

// Renderer-facing convenience: return the hydrated state or null. Detailed
// diagnostics remain available through `loadGameResult`.
export function loadGame(storage = null) {
  return loadSavedState(storage);
}

export function clearSavedGame(storage = null) {
  const target = getStorage(storage);
  if (!target?.removeItem) return { ok: false, code: "STORAGE_UNAVAILABLE", error: "El almacenamiento local no está disponible." };
  try {
    target.removeItem(STORAGE_KEY);
    return { ok: true, code: "CLEARED", key: STORAGE_KEY };
  } catch (error) {
    return { ok: false, code: "CLEAR_FAILED", error: error instanceof Error ? error.message : String(error) };
  }
}

/** Small framework-agnostic store for the Three.js controller and HUD. */
export function createGameStore(options = {}) {
  let state = options.initialState ? hydrateState(options.initialState) : createInitialState(options);
  const storage = options.storage || null;
  const autosave = options.autosave ?? true;
  const listeners = new Set();

  function notify(result) {
    listeners.forEach((listener) => listener(state, result));
  }

  return {
    getState: () => state,
    getUIData: () => getUIData(state),
    dispatch(action) {
      const result = applyAction(state, action);
      state = result.state;
      if (autosave && result.ok && !ACTION_CATALOG[action?.type]?.uiOnly) saveGame(state, storage);
      notify(result);
      return result;
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("subscribe requiere una función.");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    save: () => saveGame(state, storage),
    load() {
      const result = loadGameResult(storage);
      if (result.ok) {
        state = result.state;
        notify(result);
      }
      return result;
    },
    reset(resetOptions = {}) {
      state = createInitialState({ ...options, ...resetOptions });
      if (autosave) saveGame(state, storage);
      const result = { ok: true, state, code: "RESET", events: [] };
      notify(result);
      return result;
    },
  };
}

export const createGameState = createInitialState;
export const selectUIState = getUIData;

export default {
  SAVE_VERSION,
  STORAGE_KEY,
  PHASES,
  PHASE_DEFINITIONS,
  ACTION_TYPES,
  ACTION_CATALOG,
  RANKS,
  TECHNICAL_RULES,
  CREW_DEFINITIONS,
  DIALOGUES,
  createInitialState,
  createGameState,
  validateAction,
  applyAction,
  gameReducer,
  getAvailableActions,
  getProgressPercent,
  getRankProgress,
  getUIData,
  selectUIState,
  saveGame,
  loadGame,
  loadGameResult,
  loadSavedState,
  clearSavedGame,
  createGameStore,
};
