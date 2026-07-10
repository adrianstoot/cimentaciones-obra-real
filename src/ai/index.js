export {
  DialogueDirector,
  DIALOGUE_SCRIPT_REVISION,
  PHASE_GUIDANCE,
  SUPERVISORS,
  getAuthoredScriptIds,
} from './DialogueDirector.js';

export {
  SiteSupervisorAI,
  SUPERVISOR_EVENT_NAME,
  SUPERVISOR_RULES,
} from './SiteSupervisorAI.js';

/** Connects the framework-free AI subscription to a DOM CustomEvent. */
export function connectSupervisorToEventTarget(ai, target, eventName = 'cor:supervisor-message') {
  if (!ai?.subscribe) throw new TypeError('Se requiere una instancia de SiteSupervisorAI.');
  if (!target?.dispatchEvent) throw new TypeError('El destino debe implementar dispatchEvent.');
  const EventConstructor = target.ownerDocument?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
  if (!EventConstructor) throw new Error('CustomEvent no está disponible en este entorno.');
  return ai.subscribe((event) => target.dispatchEvent(new EventConstructor(eventName, { detail: event })));
}
