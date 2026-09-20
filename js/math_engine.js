/**
 * math_engine.js
 * Motor matemático puro y desacoplado para resolución de sistemas de ecuaciones
 * e inecuaciones lineales 2x2.
 * 
 * Sigue la metodología data_logic:
 * [INPUTS] -> [VALIDATION] -> [CALCULATION ENGINE] -> [OUTPUTS]
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MathEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const EPSILON = 1e-9;

  /**
   * Máximo común divisor
   */
  function gcd(a, b) {
    a = Math.round(Math.abs(a));
    b = Math.round(Math.abs(b));
    while (b) {
      const t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  /**
   * Simplifica una fracción y retorna su representación textual
   */
  function simplifyFraction(num, den) {
    if (Math.abs(den) < EPSILON) return { num: 0, den: 0, str: 'Indefinido' };
    if (Math.abs(num) < EPSILON) return { num: 0, den: 1, str: '0' };

    let sign = 1;
    if ((num < 0 && den > 0) || (num > 0 && den < 0)) sign = -1;

    let absNum = Math.round(Math.abs(num) * 1000000) / 1000000;
    let absDen = Math.round(Math.abs(den) * 1000000) / 1000000;

    // Si ya son casi enteros
    if (Math.abs(absNum - Math.round(absNum)) < 1e-5 && Math.abs(absDen - Math.round(absDen)) < 1e-5) {
      const iNum = Math.round(absNum);
      const iDen = Math.round(absDen);
      const d = gcd(iNum, iDen);
      const sNum = sign * (iNum / d);
      const sDen = iDen / d;
      if (sDen === 1) return { num: sNum, den: 1, str: `${sNum}` };
      return { num: sNum, den: sDen, str: `${sNum}/${sDen}` };
    }

    const val = (num / den);
    return { num: val, den: 1, str: val.toFixed(2) };
  }

  /**
   * Formatea un número decimal de forma limpia
   */
  function formatNum(val, decimals = 2) {
    if (Math.abs(val) < EPSILON) return '0';
    if (Math.abs(val - Math.round(val)) < 1e-6) return `${Math.round(val)}`;
    return Number(val.toFixed(decimals)).toString();
  }

  /**
   * Formatea una ecuación lineal ax + by (op) c
   */
  function formatEquation(a, b, op, c) {
    let parts = [];
    
    // Término x
    if (Math.abs(a) >= EPSILON) {
      if (a === 1) parts.push('x');
      else if (a === -1) parts.push('-x');
      else parts.push(`${formatNum(a)}x`);
    }

    // Término y
    if (Math.abs(b) >= EPSILON) {
      if (parts.length === 0) {
        if (b === 1) parts.push('y');
        else if (b === -1) parts.push('-y');
        else parts.push(`${formatNum(b)}y`);
      } else {
        const sign = b > 0 ? '+ ' : '- ';
        const absB = Math.abs(b);
        if (absB === 1) parts.push(`${sign}y`);
        else parts.push(`${sign}${formatNum(absB)}y`);
      }
    }

    if (parts.length === 0) parts.push('0');

    let opSymbol = op;
    if (op === '<=') opSymbol = '≤';
    if (op === '>=') opSymbol = '≥';

    return `${parts.join(' ')} ${opSymbol} ${formatNum(c)}`;
  }

  /**
   * Evalúa el lado izquierdo de una ecuación ax + by
   */
  function evaluateLHS(a, b, x, y) {
    return (a * x) + (b * y);
  }

  /**
   * Verifica si un punto (x, y) satisface la inecuación o ecuación
   */
  function satisfies(a, b, op, c, x, y, eps = 1e-6) {
    const lhs = evaluateLHS(a, b, x, y);
    switch (op) {
      case '=':
        return Math.abs(lhs - c) <= eps;
      case '<=':
        return lhs <= c + eps;
      case '>=':
        return lhs >= c - eps;
      case '<':
        return lhs < c - eps;
      case '>':
        return lhs > c + eps;
      default:
        return false;
    }
  }

  /**
   * Resuelve el sistema analítico 2x2 y genera el paso a paso
   */
  function solveSystem(eq1, eq2) {
    // Validación defensiva
    const a1 = Number(eq1.a) || 0;
    const b1 = Number(eq1.b) || 0;
    const c1 = Number(eq1.c) || 0;
    const op1 = eq1.op || '=';

    const a2 = Number(eq2.a) || 0;
    const b2 = Number(eq2.b) || 0;
    const c2 = Number(eq2.c) || 0;
    const op2 = eq2.op || '=';

    // Determinantes
    const delta = (a1 * b2) - (a2 * b1);
    const deltaX = (c1 * b2) - (c2 * b1);
    const deltaY = (a1 * c2) - (a2 * c1);

    const isInequality = op1 !== '=' || op2 !== '=';

    let systemType = 'unique'; // 'unique', 'parallel', 'coincident', 'degenerate'
    let solution = null;
    let description = '';

    // Caso degenerado: ambas variables 0 en una ecuación
    if ((Math.abs(a1) < EPSILON && Math.abs(b1) < EPSILON) || 
        (Math.abs(a2) < EPSILON && Math.abs(b2) < EPSILON)) {
      systemType = 'degenerate';
      description = 'Ecuación degenerada (los coeficientes x e y no pueden ser ambos cero).';
    } else if (Math.abs(delta) > EPSILON) {
      // Sistema Compatible Determinado (Solución única)
      systemType = 'unique';
      const x = deltaX / delta;
      const y = deltaY / delta;
      const xFrac = simplifyFraction(deltaX, delta);
      const yFrac = simplifyFraction(deltaY, delta);

      solution = {
        x: x,
        y: y,
        xFraction: xFrac.str,
        yFraction: yFrac.str,
        xFormatted: formatNum(x),
        yFormatted: formatNum(y)
      };
      description = isInequality 
        ? `Las rectas frontera se intersectan en el punto P(${solution.xFormatted}, ${solution.yFormatted}).` 
        : `Solución única (Sistema Compatible Determinado): P(${solution.xFormatted}, ${solution.yFormatted}).`;
    } else {
      // Determinante principal = 0 (Rectas con misma pendiente)
      // Comprobar si las ecuaciones son proporcionales
      const bothDeltaZero = Math.abs(deltaX) < EPSILON && Math.abs(deltaY) < EPSILON;
      if (bothDeltaZero) {
        systemType = 'coincident';
        description = isInequality 
          ? 'Las rectas frontera son coincidentes (misma recta).' 
          : 'Infinitas soluciones (Sistema Compatible Indeterminado): las rectas son coincidentes.';
      } else {
        systemType = 'parallel';
        description = isInequality 
          ? 'Las rectas frontera son paralelas sin intersección.' 
          : 'Sin solución (Sistema Incompatible): las rectas son paralelas distintas.';
      }
    }

    // Análisis de punto de prueba para inecuaciones
    const testPointsAnalysis = [];
    if (isInequality) {
      [
        { id: 1, a: a1, b: b1, op: op1, c: c1 },
        { id: 2, a: a2, b: b2, op: op2, c: c2 }
      ].forEach(eq => {
        if (eq.op === '=') return;
        
        // Punto de prueba estándar (0,0); si pasa por el origen, usar (1,0) o (0,1)
        let tx = 0, ty = 0;
        if (Math.abs(evaluateLHS(eq.a, eq.b, 0, 0) - eq.c) < EPSILON) {
          tx = 1;
          ty = 0;
        }

        const lhsVal = evaluateLHS(eq.a, eq.b, tx, ty);
        const isSatisfied = satisfies(eq.a, eq.b, eq.op, eq.c, tx, ty);
        const opSymbol = eq.op === '<=' ? '≤' : (eq.op === '>=' ? '≥' : eq.op);
        const isStrict = eq.op === '<' || eq.op === '>';

        testPointsAnalysis.push({
          eqIndex: eq.id,
          testPoint: { x: tx, y: ty },
          lhsVal: formatNum(lhsVal),
          opSymbol: opSymbol,
          c: formatNum(eq.c),
          isSatisfied: isSatisfied,
          isStrict: isStrict,
          boundaryType: isStrict ? 'Línea punteada / discontinua (los puntos de la recta no forman parte de la solución)' : 'Línea continua (los puntos de la recta sí pertenecen a la solución)',
          conclusion: isSatisfied 
            ? `El semiplano sombreado INCLUYE al punto de prueba (${tx}, ${ty}) porque ${formatNum(lhsVal)} ${opSymbol} ${formatNum(eq.c)} es VERDADERO.`
            : `El semiplano sombreado NO incluye al punto de prueba (${tx}, ${ty}) porque ${formatNum(lhsVal)} ${opSymbol} ${formatNum(eq.c)} es FALSO. Se sombrea el lado opuesto.`
        });
      });
    }

    // Generación del paso a paso estructurado
    const steps = generateStepByStep({
      eq1: { a: a1, b: b1, op: op1, c: c1 },
      eq2: { a: a2, b: b2, op: op2, c: c2 },
      delta, deltaX, deltaY,
      systemType, solution,
      isInequality,
      testPointsAnalysis
    });

    return {
      eq1: { a: a1, b: b1, op: op1, c: c1, formatted: formatEquation(a1, b1, op1, c1) },
      eq2: { a: a2, b: b2, op: op2, c: c2, formatted: formatEquation(a2, b2, op2, c2) },
      delta,
      deltaX,
      deltaY,
      systemType,
      solution,
      isInequality,
      description,
      testPointsAnalysis,
      steps
    };
  }

  /**
   * Genera el desglose analítico paso a paso
   */
  function generateStepByStep(data) {
    const { eq1, eq2, delta, deltaX, deltaY, systemType, solution, isInequality, testPointsAnalysis } = data;
    const steps = [];

    // Paso 1: Planteamiento
    steps.push({
      title: 'Paso 1: Planteamiento del Sistema',
      html: `
        <p class="mb-2">Se define el sistema de 2 expresiones lineales en forma canónica:</p>
        <div class="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-sm leading-relaxed">
          <div class="text-blue-600 dark:text-blue-400 font-semibold">Ecuación/Inecuación (1): ${formatEquation(eq1.a, eq1.b, eq1.op, eq1.c)}</div>
          <div class="text-purple-600 dark:text-purple-400 font-semibold">Ecuación/Inecuación (2): ${formatEquation(eq2.a, eq2.b, eq2.op, eq2.c)}</div>
        </div>
      `
    });

    // Paso 2: Determinantes (Regla de Cramer)
    const deltaCalc = `(${formatNum(eq1.a)} · ${formatNum(eq2.b)}) - (${formatNum(eq2.a)} · ${formatNum(eq1.b)}) = ${formatNum(eq1.a * eq2.b)} - (${formatNum(eq2.a * eq1.b)}) = <strong>${formatNum(delta)}</strong>`;
    const deltaXCalc = `(${formatNum(eq1.c)} · ${formatNum(eq2.b)}) - (${formatNum(eq2.c)} · ${formatNum(eq1.b)}) = ${formatNum(eq1.c * eq2.b)} - (${formatNum(eq2.c * eq1.b)}) = <strong>${formatNum(deltaX)}</strong>`;
    const deltaYCalc = `(${formatNum(eq1.a)} · ${formatNum(eq2.c)}) - (${formatNum(eq2.a)} · ${formatNum(eq1.c)}) = ${formatNum(eq1.a * eq2.c)} - (${formatNum(eq2.a * eq1.c)}) = <strong>${formatNum(deltaY)}</strong>`;

    steps.push({
      title: 'Paso 2: Cálculo de los Determinantes (Regla de Cramer)',
      html: `
        <p class="mb-2">Para encontrar el punto de intersección de las dos rectas frontera, calculamos los determinantes:</p>
        <ul class="space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <li class="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
            <strong>Determinante Principal (&Delta;):</strong><br>
            &Delta; = | ${formatNum(eq1.a)} &nbsp; ${formatNum(eq1.b)} |<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| ${formatNum(eq2.a)} &nbsp; ${formatNum(eq2.b)} | &nbsp;=&gt;&nbsp; ${deltaCalc}
          </li>
          <li class="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
            <strong>Determinante en X (&Delta;<sub>x</sub>):</strong><br>
            &Delta;<sub>x</sub> = | ${formatNum(eq1.c)} &nbsp; ${formatNum(eq1.b)} |<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| ${formatNum(eq2.c)} &nbsp; ${formatNum(eq2.b)} | &nbsp;=&gt;&nbsp; ${deltaXCalc}
          </li>
          <li class="bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700">
            <strong>Determinante en Y (&Delta;<sub>y</sub>):</strong><br>
            &Delta;<sub>y</sub> = | ${formatNum(eq1.a)} &nbsp; ${formatNum(eq1.c)} |<br>
            &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;| ${formatNum(eq2.a)} &nbsp; ${formatNum(eq2.c)} | &nbsp;=&gt;&nbsp; ${deltaYCalc}
          </li>
        </ul>
      `
    });

    // Paso 3: Resolución de la Intersección
    let solHtml = '';
    if (systemType === 'unique') {
      solHtml = `
        <p class="mb-2">Como <strong>&Delta; ≠ 0</strong>, el sistema tiene una <strong>solución única</strong> (punto de corte de las rectas frontera):</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 my-2 text-center font-mono">
          <div class="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
            <span class="text-xs text-blue-600 dark:text-blue-400 uppercase font-semibold tracking-wider">Coordenada X</span>
            <div class="text-lg font-bold text-blue-900 dark:text-blue-200 mt-1">x = &Delta;<sub>x</sub> / &Delta; = ${formatNum(deltaX)} / ${formatNum(delta)} = ${solution.xFraction} ≈ ${solution.xFormatted}</div>
          </div>
          <div class="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800">
            <span class="text-xs text-purple-600 dark:text-purple-400 uppercase font-semibold tracking-wider">Coordenada Y</span>
            <div class="text-lg font-bold text-purple-900 dark:text-purple-200 mt-1">y = &Delta;<sub>y</sub> / &Delta; = ${formatNum(deltaY)} / ${formatNum(delta)} = ${solution.yFraction} ≈ ${solution.yFormatted}</div>
          </div>
        </div>
        <p class="text-sm text-slate-600 dark:text-slate-400 mt-2">Punto de corte: <strong>P(${solution.xFormatted}, ${solution.yFormatted})</strong>.</p>
      `;
    } else if (systemType === 'parallel') {
      solHtml = `
        <div class="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-sm">
          <strong>&Delta; = 0 y (&Delta;<sub>x</sub> ≠ 0 o &Delta;<sub>y</sub> ≠ 0):</strong><br>
          Las dos rectas tienen exactamente la misma pendiente pero diferente ordenada en el origen. Son <strong>paralelas no coincidentes</strong>.
          No existe ningún punto de intersección común.
        </div>
      `;
    } else if (systemType === 'coincident') {
      solHtml = `
        <div class="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-900 dark:text-emerald-200 text-sm">
          <strong>&Delta; = 0 y &Delta;<sub>x</sub> = 0 y &Delta;<sub>y</sub> = 0:</strong><br>
          Ambas ecuaciones son linealmente dependientes (múltiplos escalares entre sí). Representan la <strong>misma recta</strong>, por lo que existen <strong>infinitos puntos de corte</strong>.
        </div>
      `;
    }

    steps.push({
      title: 'Paso 3: Análisis de Intersección de las Rectas',
      html: solHtml
    });

    // Paso 4: Análisis de Inecuaciones (si aplica)
    if (isInequality && testPointsAnalysis.length > 0) {
      let ineqHtml = `
        <p class="mb-3 text-sm text-slate-700 dark:text-slate-300">
          Para determinar qué lado de cada recta frontera se debe sombrear, se toma un <strong>punto de prueba testigo</strong> (usualmente el origen (0,0)) y se evalúa en cada inecuación:
        </p>
        <div class="space-y-3">
      `;

      testPointsAnalysis.forEach(t => {
        const colorClass = t.eqIndex === 1 ? 'border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30' : 'border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30';
        const badgeColor = t.isSatisfied ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300';
        
        ineqHtml += `
          <div class="p-3 rounded-lg border ${colorClass} text-sm">
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold">Inecuación (${t.eqIndex})</span>
              <span class="px-2 py-0.5 rounded text-xs font-semibold ${badgeColor}">${t.isSatisfied ? 'CUMPLE' : 'NO CUMPLE'}</span>
            </div>
            <p class="text-xs text-slate-600 dark:text-slate-400 mb-2"><strong>Tipo de frontera:</strong> ${t.boundaryType}</p>
            <p class="font-mono text-xs mb-1">Punto de prueba: (${t.testPoint.x}, ${t.testPoint.y}) &rarr; ${t.lhsVal} ${t.opSymbol} ${t.c}</p>
            <p class="text-xs font-medium text-slate-800 dark:text-slate-200">${t.conclusion}</p>
          </div>
        `;
      });

      ineqHtml += `
        </div>
        <div class="mt-3 p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs text-indigo-950 dark:text-indigo-200">
          <strong>Región Solución (Región Factible):</strong> Corresponde a la zona del plano donde se superponen ambos semiplanos simultáneamente.
        </div>
      `;

      steps.push({
        title: 'Paso 4: Análisis de Semiplanos y Región Factible',
        html: ineqHtml
      });
    }

    return steps;
  }

  /**
   * Recorta un polígono convexo con un semiplano ax + by (op) c
   * Algoritmo de Sutherland-Hodgman
   */
  function clipPolygonWithHalfPlane(polygon, a, b, op, c) {
    if (!polygon || polygon.length === 0) return [];
    if (op === '=') return []; // Una recta no tiene área interior

    const outputList = [];
    const n = polygon.length;

    function isInside(p) {
      return satisfies(a, b, op, c, p.x, p.y, 1e-7);
    }

    function computeIntersection(p1, p2) {
      // Línea de corte: a*x + b*y = c
      // Segmento paramétrico: p(t) = p1 + t*(p2 - p1)
      // a*(x1 + t*(x2-x1)) + b*(y1 + t*(y2-y1)) = c
      // t * [ a*(x2-x1) + b*(y2-y1) ] = c - a*x1 - b*y1
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const denom = (a * dx) + (b * dy);
      if (Math.abs(denom) < 1e-12) return p1;
      const t = (c - (a * p1.x) - (b * p1.y)) / denom;
      return {
        x: p1.x + t * dx,
        y: p1.y + t * dy
      };
    }

    for (let i = 0; i < n; i++) {
      const currentPoint = polygon[i];
      const prevPoint = polygon[(i + n - 1) % n];

      const currentInside = isInside(currentPoint);
      const prevInside = isInside(prevPoint);

      if (currentInside) {
        if (!prevInside) {
          outputList.push(computeIntersection(prevPoint, currentPoint));
        }
        outputList.push(currentPoint);
      } else if (prevInside) {
        outputList.push(computeIntersection(prevPoint, currentPoint));
      }
    }

    return outputList;
  }

  return {
    formatEquation,
    formatNum,
    simplifyFraction,
    evaluateLHS,
    satisfies,
    solveSystem,
    clipPolygonWithHalfPlane
  };
}));
