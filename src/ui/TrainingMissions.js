const OFFICIAL_CODE_URL = 'https://www.boe.es/buscar/doc.php?id=BOE-A-2021-13681';
const CTE_URL = 'https://www.codigotecnico.org/pdf/Documentos/SE/DBSE-C.pdf';

export const TRAINING_MISSIONS = Object.freeze({
  briefing: {
    code: 'M01', title: 'Recibir el tajo y fijar el punto de parada', reward: 40,
    scenario: 'La zapata Z-04 está excavada y dispone de hormigón de limpieza. Antes de mover ferralla debes identificar responsables, riesgos y documentación vigente.',
    questions: [
      { id: 'hold', prompt: '¿Cuándo puede hormigonarse la Z-04?', options: [
        ['crew', 'Cuando la cuadrilla termine, aunque falte control'],
        ['release', 'Solo tras liberar el punto de parada y dejar evidencia'],
        ['weather', 'En cuanto la previsión sea seca'],
      ], correct: 'release', explanation: 'La liberación exige control previo, trazabilidad y autorización según proyecto y plan de control.' },
    ],
  },
  planos: {
    code: 'M02', title: 'Elaborar el detalle técnico de ferralla', reward: 80,
    scenario: 'Convierte C-101 Rev. 03 y el cuadro de cimentación en una planilla de despiece inequívoca para Z-04.',
    diagram: 'detail',
    questions: [
      { id: 'truth', prompt: '¿Qué documento fija diámetro y paso de esta zapata?', options: [
        ['memory', 'Una regla general memorizada'], ['drawing', 'El plano C-101 vigente y su despiece'], ['supplier', 'El catálogo del suministrador'],
      ], correct: 'drawing', explanation: 'El Código regula el proceso; la geometría concreta procede del proyecto vigente.' },
      { id: 'steel', prompt: '¿Qué acero debes pedir para las marcas Z04-LI?', options: [
        ['b400', 'B400S'], ['b500', 'B500S trazable, según OR-27'], ['any', 'Cualquier corrugado Ø16'],
      ], correct: 'b500', explanation: 'No basta el diámetro: clase, colada, etiqueta y destino deben ser trazables.' },
      { id: 'schedule', prompt: '¿Qué debe identificar la planilla de despiece?', options: [
        ['shape', 'Forma, dimensiones, diámetro, cantidad y elemento de destino'], ['weight', 'Solo peso total'], ['sketch', 'Un croquis sin revisión ni firma'],
      ], correct: 'shape', explanation: 'El artículo 49.3.1 exige geometría, características, cantidad e identificación del elemento.' },
    ],
  },
  cuadrilla: {
    code: 'M03', title: 'Recepcionar acero y preparar el taller', reward: 70,
    scenario: 'Ferralla Norte llega al acopio. Comprueba medios, etiquetas y una secuencia de trabajo que no pierda trazabilidad.',
    questions: [
      { id: 'receipt', prompt: '¿Qué lote puede entrar en fabricación?', options: [
        ['labelled', 'Paquete B500S Ø16 identificado y vinculado a Z-04'], ['rust', 'Barras sueltas sin etiqueta'], ['mixed', 'Diámetros mezclados para ahorrar espacio'],
      ], correct: 'labelled', explanation: 'El almacenamiento debe conservar clasificación e identificación hasta el montaje.' },
      { id: 'equipment', prompt: 'Selecciona el equipo correcto para corte y doblado.', options: [
        ['torch', 'Soplete y doblado en caliente'], ['machines', 'Cizalla y dobladora con mandril adecuado'], ['excavator', 'Cazo de excavadora'],
      ], correct: 'machines', explanation: 'El corte no debe alterar el acero y el doblado se realiza a temperatura ambiente con máquina y mandril.' },
    ],
  },
  inspeccion: {
    code: 'M04', title: 'Simulación de corte y doblado', reward: 130,
    scenario: 'Fabrica la marca Z04-PE-16. Elige procedimiento, mandril y control dimensional antes de liberar la serie.',
    diagram: 'bend',
    questions: [
      { id: 'cut', prompt: '¿Cómo cortas las barras conforme a despiece?', options: [
        ['shear', 'Cizalla o máquina programada y control dimensional'], ['flame', 'Soplete para acelerar'], ['break', 'Doblado repetido hasta partir'],
      ], correct: 'shear', explanation: 'El artículo 49.3.3 exige corte según proyecto sin alterar propiedades del producto.' },
      { id: 'mandrel', prompt: 'Gancho Ø16 en B500S: mandril mínimo del ejercicio.', options: [
        ['2phi', '2φ = 32 mm'], ['4phi', '4φ = 64 mm'], ['12phi', '12φ = 192 mm'],
      ], correct: '4phi', explanation: 'Para gancho/patilla/U, B500S y Ø<20 mm, la tabla del artículo 49.3.4 fija 4φ. Otras barras curvadas tienen otro criterio.' },
      { id: 'bend', prompt: '¿Cómo ejecutas el doblado?', options: [
        ['ambient', 'A temperatura ambiente, velocidad constante y curvatura uniforme'], ['heat', 'Calentando localmente la barra'], ['rebend', 'Enderezando y redoblando hasta ajustar'],
      ], correct: 'ambient', explanation: 'No se improvisa el radio ni se enderezan codos salvo condición excepcional justificada sin daño.' },
    ],
  },
  correccion: {
    code: 'M05', title: 'Montar la armadura de la zapata', reward: 150,
    scenario: 'La cuadrilla va a montar la parrilla inferior, esperas y separadores. Ordena el trabajo para conservar geometría y recubrimiento.',
    diagram: 'assembly',
    questions: [
      { id: 'sequence', prompt: 'Elige la secuencia de montaje correcta.', options: [
        ['good', 'Limpiar → replantear → separadores → parrilla → esperas → atado y control'],
        ['bad1', 'Parrilla sobre el fondo → levantarla al final'],
        ['bad2', 'Hormigonar limpieza después de montar el acero'],
      ], correct: 'good', explanation: 'La armadura debe quedar estable, limpia y con recubrimiento asegurado antes del punto de parada.' },
      { id: 'spacing', prompt: 'Aparece un paño a 270 mm y C-101 prescribe 200 ± 10 mm.', options: [
        ['accept', 'Aceptar porque hay bastante acero en el resto'], ['correct', 'Parar, recolocar, atar y volver a medir'], ['hide', 'Añadir una barra sin actualizar despiece ni evidencia'],
      ], correct: 'correct', explanation: 'La desviación se corrige y documenta; no se oculta ni se compensa de forma improvisada.' },
    ],
  },
  reinspeccion: {
    code: 'M06', title: 'Resolver solapes, anclajes y recubrimiento', reward: 160,
    scenario: 'Antes de liberar el armado, revisa un empalme por solapo y demuestra que coincide con el detalle calculado del proyecto.',
    diagram: 'lap',
    questions: [
      { id: 'length', prompt: '¿Cómo se determina la longitud de solapo?', options: [
        ['fixed', 'Siempre 50φ'], ['calculated', 'α · lb,neta según cálculo, disposición y proyecto'], ['visual', 'Mientras parezca suficiente'],
      ], correct: 'calculated', explanation: 'No existe una cifra universal: intervienen anclaje neto, porcentaje solapado, separación y esfuerzo.' },
      { id: 'distance', prompt: 'En el solapo, ¿cómo se colocan las barras?', options: [
        ['beside', 'Una junto a otra, separación ≤4φ y respetando distancia mínima en tracción'], ['stack', 'Apiladas sin límite'], ['weld', 'Soldadas siempre'],
      ], correct: 'beside', explanation: 'El artículo 49.5.2.2 limita la separación y exige además la distancia mínima correspondiente.' },
      { id: 'transverse', prompt: '¿Qué debes comprobar además en la zona solapada?', options: [
        ['none', 'Nada más'], ['transverse', 'Armadura transversal suficiente y ubicación prevista'], ['paint', 'Pintura anticorrosión sobre las barras'],
      ], correct: 'transverse', explanation: 'La zona necesita armadura transversal con sección al menos igual a la mayor barra solapada, según el caso normativo.' },
    ],
  },
  clima: {
    code: 'M07', title: 'Planificar la ventana de hormigonado', reward: 120,
    scenario: 'Cruza precipitación, acceso de cubas, protección del tajo y continuidad antes de mantener o reprogramar el suministro.',
    questions: [],
  },
  vertido: {
    code: 'M08', title: 'Recepcionar y colocar el hormigón', reward: 220,
    scenario: 'Llega el lote H-2407. El punto de parada está liberado, pero aún debes comprobar la recepción y el método de colocación.',
    questions: [
      { id: 'ticket', prompt: 'Antes de descargar, ¿qué compruebas?', options: [
        ['ticket', 'Albarán, lote, identificación, hora, consistencia prevista y muestreo'], ['plate', 'Solo matrícula'], ['colour', 'Solo color del hormigón'],
      ], correct: 'ticket', explanation: 'La recepción debe vincular suministro, elemento y plan de control.' },
      { id: 'vibrate', prompt: '¿Cómo planteas el vibrado?', options: [
        ['planned', 'Secuencia compatible con geometría y paso entre barras'], ['hit', 'Golpear el encofrado únicamente'], ['move', 'Usar el vibrador para desplazar horizontalmente el hormigón'],
      ], correct: 'planned', explanation: 'La disposición de armaduras debe permitir colocación y paso del vibrador sin alterar la ferralla.' },
    ],
  },
  curado: {
    code: 'M09', title: 'Proteger y curar', reward: 140,
    scenario: 'El vertido termina. El elemento sigue siendo vulnerable a pérdida de humedad, temperatura y tránsito accidental.',
    questions: [
      { id: 'cure', prompt: '¿Cuál es la respuesta correcta?', options: [
        ['protect', 'Aplicar el método previsto, señalizar y registrar controles'], ['leave', 'Abandonar el tajo al terminar el vertido'], ['load', 'Acopiar material encima inmediatamente'],
      ], correct: 'protect', explanation: 'Curado, protección y registro forman parte de la ejecución, no son decoración final.' },
    ],
  },
  debrief: {
    code: 'M10', title: 'Cerrar el dossier de aprendizaje', reward: 190,
    scenario: 'Reconstruye qué se decidió, con qué fuente, qué incidencia apareció y qué evidencia demuestra su cierre.',
    questions: [
      { id: 'trace', prompt: '¿Qué dossier es trazable?', options: [
        ['complete', 'Plano vigente + planilla + etiquetas + controles + incidencia + cierre'], ['photos', 'Solo fotografías sin identificar'], ['memory', 'La explicación verbal del capataz'],
      ], correct: 'complete', explanation: 'Una tercera persona debe poder reconstruir el proceso y sus responsables.' },
    ],
  },
});

function technicalDiagram(type) {
  if (type === 'detail') return `<div class="cor-training-diagram cor-training-diagram--detail"><svg viewBox="0 0 620 250" aria-label="Esquema de armado de la zapata Z-04"><g class="grid">${Array.from({ length: 13 }, (_, i) => `<path d="M${78 + i * 37} 38v164"/>`).join('')}${Array.from({ length: 9 }, (_, i) => `<path d="M78 ${38 + i * 20.5}h444"/>`).join('')}</g><path class="outline" d="M52 20h496v200H52z"/><path class="column" d="M256 82h88v76h-88z"/><path class="dim" d="M52 236h496m-496-9v18m496-18v18"/><text x="255" y="248">3 800 mm</text><text x="236" y="72">PILAR / ARRANQUES</text></svg><div class="cor-rebar-schedule"><strong>PLANILLA OR-27 · C-101 R03</strong><span>Z04-LI-X · Ø16 · B500S · c/200</span><span>Z04-LI-Y · Ø16 · B500S · c/200</span><span>Recubrimiento de proyecto · 75 mm</span></div></div>`;
  if (type === 'bend') return `<div class="cor-training-diagram cor-training-diagram--bend"><svg viewBox="0 0 620 240" aria-label="Detalle de doblado con mandril"><path class="bar" d="M84 182h250a72 72 0 0 0 72-72V54"/><circle class="mandrel" cx="334" cy="110" r="52"/><path class="dim" d="M282 110h104"/><text x="307" y="98">Øm</text><text x="428" y="73">B500S · Ø16</text><text x="428" y="101">GANCHO: Øm ≥ 4φ</text><text x="428" y="129">EJERCICIO: 64 mm</text></svg></div>`;
  if (type === 'assembly') return `<div class="cor-training-diagram cor-training-diagram--assembly"><div><b>01</b><span>LIMPIEZA<br><small>Sin barro ni residuos</small></span></div><i></i><div><b>02</b><span>SEPARADORES<br><small>Tipo y densidad del proyecto</small></span></div><i></i><div><b>03</b><span>PARRILLA<br><small>Paso, atado y estabilidad</small></span></div><i></i><div><b>04</b><span>ESPERAS<br><small>Posición y anclaje</small></span></div></div>`;
  if (type === 'lap') return `<div class="cor-training-diagram cor-training-diagram--lap"><svg viewBox="0 0 620 220" aria-label="Esquema didáctico de empalme por solapo"><path class="bar" d="M56 82h365M196 138h368"/><path class="dim" d="M196 174h225m-225-12v24m225-24v24"/><path class="gap" d="M458 82v56"/><text x="272" y="198">l₀ = α · lb,neta</text><text x="470" y="115">s ≤ 4φ</text><path class="tie" d="M225 54v112m52-112v112m52-112v112m52-112v112"/></svg></div>`;
  return '';
}

export function renderTrainingMission(phase, answers = {}, ui = {}) {
  const mission = TRAINING_MISSIONS[phase] ?? TRAINING_MISSIONS.briefing;
  const solved = mission.questions.filter((question) => answers[question.id]?.correct).length;
  const complete = solved === mission.questions.length;
  const phaseNumber = ui?.mission?.phaseNumber ?? 1;
  return `<div class="cor-training">
    <header class="cor-training-hero"><div><span>MISIÓN ${mission.code} · FERRALLA Y CIMENTACIONES</span><h3>${mission.title}</h3><p>${mission.scenario}</p></div><aside><small>RECOMPENSA</small><strong>+${mission.reward} XP</strong><em>${solved}/${mission.questions.length} decisiones</em></aside></header>
    ${technicalDiagram(mission.diagram)}
    <div class="cor-source-hierarchy"><span><b>1</b>CÓDIGO ESTRUCTURAL · ART. 49</span><i>→</i><span><b>2</b>PROYECTO OR-27 · C-101</span><i>→</i><span><b>3</b>PLANILLA Y PROCEDIMIENTO</span></div>
    <div class="cor-training-questions">${mission.questions.map((question, index) => {
      const answer = answers[question.id];
      return `<article class="${answer ? answer.correct ? 'is-correct' : 'is-wrong' : ''}"><header><b>${String(index + 1).padStart(2, '0')}</b><h4>${question.prompt}</h4></header><div>${question.options.map(([value, label]) => `<button type="button" data-training-choice data-phase="${phase}" data-question="${question.id}" data-choice="${value}" data-correct="${value === question.correct}" class="${answer?.choice === value ? 'is-selected' : ''}" ${answer?.correct ? 'disabled' : ''}><i></i>${label}</button>`).join('')}</div>${answer ? `<p><strong>${answer.correct ? 'DECISIÓN CORRECTA' : 'REVISA LA DECISIÓN'}</strong>${question.explanation}</p>` : ''}</article>`;
    }).join('')}</div>
    <footer class="cor-training-footer"><div><strong>${complete ? 'COMPETENCIA DEMOSTRADA' : 'SIMULACIÓN EN CURSO'}</strong><span>${complete ? 'Puedes registrar la misión y avanzar al siguiente frente.' : 'Resuelve correctamente todas las decisiones para avanzar.'}</span></div><button type="button" class="cor-primary-button" data-hud-action="complete-training" ${complete ? '' : 'disabled'}>REGISTRAR MISIÓN ${phaseNumber}</button></footer>
    <div class="cor-training-sources"><span>Fuentes didácticas verificadas:</span><a href="${OFFICIAL_CODE_URL}" target="_blank" rel="noreferrer">Código Estructural · art. 49</a><a href="${CTE_URL}" target="_blank" rel="noreferrer">CTE DB-SE-C</a><em>Los valores geométricos mostrados pertenecen al proyecto ficticio OR-27.</em></div>
  </div>`;
}

export default TRAINING_MISSIONS;
