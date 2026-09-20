/**
 * run_tests.js
 * Batería de pruebas unitarias para certificar la calidad matemática (QA)
 */

const MathEngine = require('../js/math_engine.js');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('--- INICIANDO SUITE DE PRUEBAS DEL MOTOR MATEMÁTICO ---');

// 1. Caso Nominal: 2x + y = 5, x - y = 1 -> (2, 1)
{
  const res = MathEngine.solveSystem(
    { a: 2, b: 1, op: '=', c: 5 },
    { a: 1, b: -1, op: '=', c: 1 }
  );
  assert(res.systemType === 'unique', 'Caso nominal debe ser solución única');
  assert(Math.abs(res.solution.x - 2) < 1e-5, 'x debe ser 2');
  assert(Math.abs(res.solution.y - 1) < 1e-5, 'y debe ser 1');
  assert(res.delta === -3, 'Determinante principal delta debe ser -3');
}

// 2. Caso Rectas Vertical y Horizontal: x = 3, y = 4 -> (3, 4)
{
  const res = MathEngine.solveSystem(
    { a: 1, b: 0, op: '=', c: 3 },
    { a: 0, b: 1, op: '=', c: 4 }
  );
  assert(res.systemType === 'unique', 'Rectas ortogonales deben tener solución única');
  assert(Math.abs(res.solution.x - 3) < 1e-5, 'x debe ser 3');
  assert(Math.abs(res.solution.y - 4) < 1e-5, 'y debe ser 4');
}

// 3. Caso Paralelas (Incompatible): 2x + 4y = 8, x + 2y = 10
{
  const res = MathEngine.solveSystem(
    { a: 2, b: 4, op: '=', c: 8 },
    { a: 1, b: 2, op: '=', c: 10 }
  );
  assert(res.systemType === 'parallel', 'Rectas con pendiente igual y diferente ordenada deben ser paralelas');
  assert(res.solution === null, 'No debe existir solución en paralelas');
}

// 4. Caso Coincidentes (Indeterminado): x + y = 2, 2x + 2y = 4
{
  const res = MathEngine.solveSystem(
    { a: 1, b: 1, op: '=', c: 2 },
    { a: 2, b: 2, op: '=', c: 4 }
  );
  assert(res.systemType === 'coincident', 'Ecuaciones proporcionales deben ser coincidentes');
}

// 5. Inecuaciones y pruebas de pertenencia
{
  const res = MathEngine.solveSystem(
    { a: 1, b: 1, op: '<=', c: 4 },
    { a: 1, b: -1, op: '>=', c: 0 }
  );
  assert(res.isInequality === true, 'Debe detectar sistema de inecuaciones');
  assert(res.testPointsAnalysis.length === 2, 'Debe analizar puntos de prueba para ambas inecuaciones');
  // Prueba de punto (0, 0): 0 + 0 <= 4 (Verdadero), 0 - 0 >= 0 (Verdadero)
  assert(MathEngine.satisfies(1, 1, '<=', 4, 0, 0) === true, '(0,0) satisface x + y <= 4');
  assert(MathEngine.satisfies(1, 1, '<=', 4, 5, 0) === false, '(5,0) no satisface x + y <= 4');
}

// 6. Recorte de Polígono (Sutherland-Hodgman)
{
  const box = [
    { x: -10, y: -10 },
    { x: 10, y: -10 },
    { x: 10, y: 10 },
    { x: -10, y: 10 }
  ];
  // Cortar con x <= 0
  const clipped = MathEngine.clipPolygonWithHalfPlane(box, 1, 0, '<=', 0);
  assert(clipped.length >= 4, 'Polígono recortado debe tener al menos 4 vértices');
  const allLeft = clipped.every(p => p.x <= 1e-6);
  assert(allLeft === true, 'Todos los vértices del polígono deben tener x <= 0');
}

console.log(`\nRESULTADOS: ${passedTests} de ${totalTests} pruebas pasadas con éxito.`);
if (passedTests === totalTests) {
  console.log('TODAS LAS PRUEBAS MATEMÁTICAS APROBADAS (QA VERIFIED).');
  process.exit(0);
} else {
  console.error('ALGUNAS PRUEBAS FALLARON.');
  process.exit(1);
}
