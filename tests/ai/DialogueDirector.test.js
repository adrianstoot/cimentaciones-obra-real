import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DialogueDirector,
  DIALOGUE_SCRIPT_REVISION,
  PHASE_GUIDANCE,
  getAuthoredScriptIds,
} from '../../src/ai/DialogueDirector.js';

const EXPECTED_PHASES = [
  'briefing', 'planos', 'cuadrilla', 'inspeccion', 'correccion',
  'reinspeccion', 'clima', 'vertido', 'curado', 'debrief',
];

test('las diez fases tienen instrucción e intervención por inactividad', () => {
  assert.deepEqual(Object.keys(PHASE_GUIDANCE), EXPECTED_PHASES);
  const director = new DialogueDirector();

  for (const phase of EXPECTED_PHASES) {
    const instruction = director.resolve('phase.instruction', { phase });
    const idle = director.resolve('behaviour.idle', { phase });
    assert.equal(instruction.phase, undefined);
    assert.equal(instruction.trace.phase, phase);
    assert.equal(instruction.text, PHASE_GUIDANCE[phase].instruction);
    assert.equal(instruction.recommendedAction, PHASE_GUIDANCE[phase].action);
    assert.equal(idle.text, PHASE_GUIDANCE[phase].idle);
    assert.ok(instruction.speaker.name.length > 3);
  }
});

test('cada mensaje conserva rama, revisión y prueba de que es guion cerrado', () => {
  const director = new DialogueDirector();
  const message = director.resolve('safety.risk-zone', {
    phase: 'inspeccion',
    occurrence: 1,
    variables: { zone: 'el borde de excavación Z-04' },
  });

  assert.equal(message.authoredBranchId, 'risk-zone-b');
  assert.match(message.text, /borde de excavación Z-04/);
  assert.equal(message.trace.generative, false);
  assert.equal(message.trace.mode, 'authored-branches');
  assert.equal(message.trace.scriptRevision, DIALOGUE_SCRIPT_REVISION);
  assert.ok(getAuthoredScriptIds().includes('procedure.pour-before-release'));
});

test('un identificador de guion desconocido falla de forma explícita', () => {
  const director = new DialogueDirector();
  assert.throws(() => director.resolve('texto.generado.al-vuelo'), /Guion reactivo desconocido/);
});
