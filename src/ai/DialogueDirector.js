/**
 * Authored dialogue for the site supervision system.
 *
 * This module contains no language model integration. Every sentence has a
 * stable branch id so a training review can reconstruct exactly why it was
 * shown and which revision of the script produced it.
 */

export const DIALOGUE_SCRIPT_REVISION = 'OR27-reactive-dialogue-2026.07.10-r1';

export const SUPERVISORS = Object.freeze({
  marta: Object.freeze({ id: 'marta-salas', name: 'Marta Salas', role: 'Jefa de obra' }),
  diego: Object.freeze({ id: 'diego-martin', name: 'Diego Martín', role: 'Ingeniero de estructuras' }),
  ivan: Object.freeze({ id: 'ivan-ruiz', name: 'Iván Ruiz', role: 'Capataz' }),
  lucia: Object.freeze({ id: 'lucia-torres', name: 'Lucía Torres', role: 'Técnica de calidad' }),
  nuria: Object.freeze({ id: 'nuria-vega', name: 'Nuria Vega', role: 'Prevencionista' }),
  sergio: Object.freeze({ id: 'sergio-cano', name: 'Sergio Cano', role: 'Técnico de hormigón' }),
});

/** One authored instruction and one inactivity prompt for every campaign phase. */
export const PHASE_GUIDANCE = Object.freeze({
  briefing: Object.freeze({
    speaker: 'marta', title: 'Empieza por el punto de parada', action: 'START_BRIEFING',
    instruction: 'Antes de entrar al tajo, confirma el briefing, los EPI y quién puede liberar la zapata Z-04.',
    idle: 'Alex, te espero en el acceso sur. Sin briefing confirmado no empezamos el paquete de trabajo.',
  }),
  planos: Object.freeze({
    speaker: 'diego', title: 'Contrasta la revisión vigente', action: 'REVIEW_PLANS',
    instruction: 'Abre C-101, GEO-02 y PC-01. Separa lo que exige el proyecto de cualquier recomendación general.',
    idle: 'No avances por memoria. Revisa los tres documentos y deja identificada su revisión.',
  }),
  cuadrilla: Object.freeze({
    speaker: 'ivan', title: 'Organiza el frente', action: 'ASSIGN_CREW',
    instruction: 'Asigna una cuadrilla competente, confirma medios y cierra la charla de tarea antes de movilizarla.',
    idle: 'La cuadrilla está esperando una orden clara. Confirma personal, medios y alcance del trabajo.',
  }),
  inspeccion: Object.freeze({
    speaker: 'lucia', title: 'Inspecciona antes de liberar', action: 'SCAN_FOUNDATION',
    instruction: 'Escanea la parrilla completa y registra recubrimiento, separación, encofrado y cota con evidencia identificada.',
    idle: 'El punto de parada sigue abierto. Acércate a Z-04 y completa la inspección con la tablet.',
  }),
  correccion: Object.freeze({
    speaker: 'ivan', title: 'Corrige sin ocultar la incidencia', action: 'CORRECT_REBAR',
    instruction: 'Mantén el frente parado, reajusta la armadura conforme al plano y documenta exactamente qué se ha corregido.',
    idle: 'La incidencia continúa abierta. No abandones el frente: corrige o escala el problema.',
  }),
  reinspeccion: Object.freeze({
    speaker: 'lucia', title: 'Verifica la corrección', action: 'REINSPECT',
    instruction: 'Repite las mediciones; una reparación ejecutada no equivale a una reparación aceptada.',
    idle: 'Falta la reinspección. Vuelve a medir antes de solicitar la liberación del punto de parada.',
  }),
  clima: Object.freeze({
    speaker: 'nuria', title: 'Reevalúa la ventana de trabajo', action: 'REVIEW_WEATHER',
    instruction: 'Cruza previsión, accesos, escorrentía, protección y continuidad del suministro antes de decidir.',
    idle: 'El frente de lluvia se acerca. Necesitamos una decisión documentada sobre la ventana de hormigonado.',
  }),
  vertido: Object.freeze({
    speaker: 'sergio', title: 'Controla el lote antes del vertido', action: 'AUTHORISE_POUR',
    instruction: 'Comprueba la liberación, el albarán, la identificación del lote, el control previsto y la secuencia de vibrado.',
    idle: 'La cuba no puede quedar esperando sin control. Verifica lote y liberación antes de autorizar.',
  }),
  curado: Object.freeze({
    speaker: 'ivan', title: 'Protege el hormigón joven', action: 'COMPLETE_CURING',
    instruction: 'Aplica la protección prevista, señaliza el elemento y registra temperatura, humedad y primer control.',
    idle: 'El vertido no termina al vaciar la cuba. Completa ahora la protección y el registro de curado.',
  }),
  debrief: Object.freeze({
    speaker: 'marta', title: 'Cierra la trazabilidad', action: 'CLOSE_REPORT',
    instruction: 'Comprueba que documentación, controles, incidencia, lote y curado puedan reconstruirse desde el informe.',
    idle: 'Solo falta el cierre. Revisa el dossier y firma cuando toda la evidencia sea trazable.',
  }),
});

const SCRIPTS = Object.freeze({
  'safety.risk-zone': Object.freeze({
    speaker: 'nuria', kind: 'warning', severity: 'high', title: 'Entrada en zona de riesgo',
    variants: Object.freeze([
      Object.freeze({ id: 'risk-zone-a', text: 'Atención, has entrado en {{zone}}. Detente y confirma delimitación, autorización y protecciones antes de continuar.' }),
      Object.freeze({ id: 'risk-zone-b', text: '{{zone}} no es una zona de paso. Revisa el control indicado y entra solo con las condiciones confirmadas.' }),
    ]),
  }),
  'safety.ppe-missing': Object.freeze({
    speaker: 'nuria', kind: 'reprimand', severity: 'critical', title: 'EPI incompleto',
    variants: Object.freeze([
      Object.freeze({ id: 'ppe-a', text: 'Para ahora. Te falta {{missingPpe}}; sal de la zona operativa y corrígelo antes de retomar el trabajo.' }),
      Object.freeze({ id: 'ppe-b', text: 'No continúes con {{missingPpe}} sin colocar. Recupera el EPI y confirma su ajuste.' }),
    ]),
  }),
  'safety.housekeeping': Object.freeze({
    speaker: 'ivan', kind: 'reprimand', severity: 'high', title: 'Orden y accesos',
    variants: Object.freeze([
      Object.freeze({ id: 'housekeeping-a', text: 'Ese acceso no está en condiciones. Retira obstáculos y ordena el acopio antes de mover personal o maquinaria.' }),
      Object.freeze({ id: 'housekeeping-b', text: 'Primero deja libre el itinerario. El orden del tajo también es una medida preventiva.' }),
    ]),
  }),
  'procedure.pour-before-release': Object.freeze({
    speaker: 'marta', kind: 'reprimand', severity: 'critical', title: 'Vertido bloqueado',
    variants: Object.freeze([
      Object.freeze({ id: 'pour-hold-a', text: 'No autorizo el vertido: el punto de parada no está liberado. Cierra inspección, incidencias y clima antes de llamar a la cuba.' }),
      Object.freeze({ id: 'pour-hold-b', text: 'Has intentado saltar una liberación obligatoria del paquete. Vuelve al control pendiente y deja evidencia de su cierre.' }),
    ]),
  }),
  'quality.defect-detected': Object.freeze({
    speaker: 'lucia', kind: 'instruction', severity: 'high', title: 'No conformidad detectada',
    variants: Object.freeze([
      Object.freeze({ id: 'defect-found-a', text: 'La separación medida no coincide con la prescripción de Z-04. Abre la incidencia, para el frente y corrige con referencia al plano.' }),
    ]),
  }),
  'quality.defect-ignored': Object.freeze({
    speaker: 'ivan', kind: 'reprimand', severity: 'high', title: 'Incidencia sin atender',
    variants: Object.freeze([
      Object.freeze({ id: 'defect-ignore-a', text: 'La incidencia {{incident}} sigue abierta. No cambies de frente: corrígela o escálala a la jefa de obra.' }),
      Object.freeze({ id: 'defect-ignore-b', text: 'Has dejado una no conformidad pendiente. La producción queda parada hasta corregir y volver a inspeccionar.' }),
    ]),
  }),
  'weather.rain-reevaluate': Object.freeze({
    speaker: 'nuria', kind: 'warning', severity: 'high', title: 'Condiciones meteorológicas cambiantes',
    variants: Object.freeze([
      Object.freeze({ id: 'rain-a', text: 'Está lloviendo. No apliques una prohibición automática: reevalúa accesos, escorrentía, estabilidad, protección y continuidad del trabajo.' }),
      Object.freeze({ id: 'rain-b', text: 'Cambio de condiciones. Pausa la decisión y documenta si el tajo puede mantenerse con controles suficientes.' }),
    ]),
  }),
  'weather.rain-during-pour': Object.freeze({
    speaker: 'sergio', kind: 'reprimand', severity: 'critical', title: 'Vertido bajo lluvia',
    variants: Object.freeze([
      Object.freeze({ id: 'rain-pour-a', text: 'Detén la autorización. Con lluvia activa hay que reevaluar recepción, acceso, acabado y protección del hormigón fresco.' }),
      Object.freeze({ id: 'rain-pour-b', text: 'No mantengas el vertido por inercia. Escala el cambio y confirma una secuencia viable y protegida.' }),
    ]),
  }),
  'weather.forecast-review': Object.freeze({
    speaker: 'nuria', kind: 'instruction', severity: 'medium', title: 'Previsión pendiente',
    variants: Object.freeze([
      Object.freeze({ id: 'forecast-a', text: 'El frente previsto coincide con la reserva inicial. Compara la ventana seca con accesos, suministro y medios de protección.' }),
    ]),
  }),
  'behaviour.idle': Object.freeze({
    speaker: 'ivan', kind: 'instruction', severity: 'low', title: 'Trabajo pendiente',
    variants: Object.freeze([
      Object.freeze({ id: 'idle-phase', text: '{{idlePrompt}}' }),
    ]),
  }),
  'quality.correction-good': Object.freeze({
    speaker: 'ivan', kind: 'praise', severity: 'positive', title: 'Corrección ejecutada',
    variants: Object.freeze([
      Object.freeze({ id: 'correction-good-a', text: 'Bien resuelto: has mantenido la incidencia trazable y corregido la armadura. Ahora debe validarla una reinspección independiente.' }),
    ]),
  }),
  'quality.reinspection-good': Object.freeze({
    speaker: 'lucia', kind: 'praise', severity: 'positive', title: 'Reinspección conforme',
    variants: Object.freeze([
      Object.freeze({ id: 'reinspection-good-a', text: 'Control repetido y evidencia vinculada: la incidencia puede cerrarse y el punto de parada avanza correctamente.' }),
    ]),
  }),
  'management.weather-good': Object.freeze({
    speaker: 'nuria', kind: 'praise', severity: 'positive', title: 'Ventana segura coordinada',
    variants: Object.freeze([
      Object.freeze({ id: 'weather-good-a', text: 'Buena decisión: has coordinado clima, accesos, suministro y protección sin reducirlo todo a “llueve o no llueve”.' }),
    ]),
  }),
  'mission.traceability-good': Object.freeze({
    speaker: 'marta', kind: 'praise', severity: 'positive', title: 'Trazabilidad cerrada',
    variants: Object.freeze([
      Object.freeze({ id: 'traceability-good-a', text: 'Trabajo completo. Cada decisión puede reconstruirse desde el informe y la incidencia quedó corregida y verificada.' }),
    ]),
  }),
});

function interpolateAuthoredText(text, variables) {
  return text.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key) => {
    const value = variables[key];
    return value === undefined || value === null || value === '' ? 'el elemento indicado' : String(value);
  });
}

function phaseScript(phase, mode) {
  const guidance = PHASE_GUIDANCE[phase];
  if (!guidance) return null;
  const idle = mode === 'idle';
  return {
    speaker: guidance.speaker,
    kind: 'instruction',
    severity: idle ? 'low' : 'medium',
    title: idle ? 'Tarea pendiente' : guidance.title,
    variants: [{
      id: `${phase}-${idle ? 'idle' : 'instruction'}-a`,
      text: idle ? guidance.idle : guidance.instruction,
    }],
  };
}

/** Deterministic authored-branch selector. */
export class DialogueDirector {
  constructor(options = {}) {
    this.revision = options.revision ?? DIALOGUE_SCRIPT_REVISION;
  }

  resolve(scriptId, context = {}) {
    const phase = context.phase ?? 'briefing';
    const occurrence = Number.isFinite(context.occurrence) ? context.occurrence : 0;
    const script = scriptId === 'phase.instruction'
      ? phaseScript(phase, 'instruction')
      : scriptId === 'behaviour.idle'
        ? { ...SCRIPTS['behaviour.idle'], speaker: PHASE_GUIDANCE[phase]?.speaker ?? 'ivan' }
        : SCRIPTS[scriptId];
    if (!script) throw new RangeError(`Guion reactivo desconocido: ${scriptId}`);

    const variants = script.variants;
    const variant = variants[Math.abs(occurrence) % variants.length];
    const guidance = PHASE_GUIDANCE[phase] ?? PHASE_GUIDANCE.briefing;
    const variables = {
      zone: 'la zona delimitada',
      incident: 'registrada',
      missingPpe: 'el EPI requerido',
      idlePrompt: guidance.idle,
      ...context.variables,
    };
    const speaker = SUPERVISORS[script.speaker] ?? SUPERVISORS.ivan;

    return Object.freeze({
      scriptId,
      authoredBranchId: variant.id,
      title: interpolateAuthoredText(script.title, variables),
      text: interpolateAuthoredText(variant.text, variables),
      kind: script.kind,
      severity: script.severity,
      speaker: Object.freeze({ ...speaker }),
      recommendedAction: context.recommendedAction ?? guidance.action ?? null,
      trace: Object.freeze({
        mode: 'authored-branches',
        generative: false,
        scriptRevision: this.revision,
        project: 'OR-27',
        phase,
      }),
    });
  }
}

export function getAuthoredScriptIds() {
  return Object.freeze([...Object.keys(SCRIPTS), 'phase.instruction']);
}

export default DialogueDirector;
