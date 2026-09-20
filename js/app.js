/**
 * app.js
 * Controlador principal de la aplicación.
 * Sincroniza interfaz de usuario, eventos, motor matemático y renderizado de gráficos.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elementos DOM - Entradas Ecuación 1
  const inA1 = document.getElementById('in-a1');
  const inB1 = document.getElementById('in-b1');
  const inOp1 = document.getElementById('in-op1');
  const inC1 = document.getElementById('in-c1');
  const previewEq1 = document.getElementById('preview-eq1');

  // Elementos DOM - Entradas Ecuación 2
  const inA2 = document.getElementById('in-a2');
  const inB2 = document.getElementById('in-b2');
  const inOp2 = document.getElementById('in-op2');
  const inC2 = document.getElementById('in-c2');
  const previewEq2 = document.getElementById('preview-eq2');

  // Elementos DOM - Resultados
  const badgeSystemType = document.getElementById('badge-system-type');
  const cardSolution = document.getElementById('card-solution');
  const textSolutionCoords = document.getElementById('text-solution-coords');
  const textSolutionDesc = document.getElementById('text-solution-desc');
  const stepsContainer = document.getElementById('steps-container');

  // Elementos DOM - Gráfico y Controles
  const canvasElement = document.getElementById('cartesian-canvas');
  const hoverCoordsBadge = document.getElementById('hover-coords-badge');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');
  const btnCenterSol = document.getElementById('btn-center-sol');
  const toggleGrid = document.getElementById('toggle-grid');
  const toggleShading = document.getElementById('toggle-shading');

  // Presets
  const presetButtons = document.querySelectorAll('[data-preset]');

  // Inicializar Canvas
  const graph = new CanvasGraph(canvasElement);

  // Callback de coordenadas hover
  graph.onHoverCoords = (coords) => {
    if (!coords) return;
    const xStr = coords.x.toFixed(2);
    const yStr = coords.y.toFixed(2);
    
    // Verificar si cumple inecuaciones
    let statusText = '';
    if (graph.systemData && graph.systemData.isInequality) {
      const eq1 = graph.systemData.eq1;
      const eq2 = graph.systemData.eq2;
      const ok1 = MathEngine.satisfies(eq1.a, eq1.b, eq1.op, eq1.c, coords.x, coords.y);
      const ok2 = MathEngine.satisfies(eq2.a, eq2.b, eq2.op, eq2.c, coords.x, coords.y);

      if (eq1.op !== '=' && eq2.op !== '=') {
        if (ok1 && ok2) {
          statusText = ' • <span class="text-emerald-500 font-semibold">En Región Factible</span>';
        } else {
          statusText = ' • <span class="text-rose-400">Fuera de Región</span>';
        }
      }
    }

    hoverCoordsBadge.innerHTML = `X: ${xStr}, Y: ${yStr}${statusText}`;
  };

  /**
   * Recoge el estado actual de los inputs
   */
  function getCurrentState() {
    return {
      eq1: {
        a: parseFloat(inA1.value) || 0,
        b: parseFloat(inB1.value) || 0,
        op: inOp1.value,
        c: parseFloat(inC1.value) || 0
      },
      eq2: {
        a: parseFloat(inA2.value) || 0,
        b: parseFloat(inB2.value) || 0,
        op: inOp2.value,
        c: parseFloat(inC2.value) || 0
      }
    };
  }

  /**
   * Actualiza el sistema y vuelve a calcular y renderizar
   */
  function updateSystem() {
    const { eq1, eq2 } = getCurrentState();

    // Actualizar visualización natural de las ecuaciones
    previewEq1.textContent = MathEngine.formatEquation(eq1.a, eq1.b, eq1.op, eq1.c);
    previewEq2.textContent = MathEngine.formatEquation(eq2.a, eq2.b, eq2.op, eq2.c);

    // Resolver con motor matemático
    const result = MathEngine.solveSystem(eq1, eq2);

    // Actualizar estado del sistema en UI
    updateResultsUI(result);

    // Actualizar Gráfica Canvas
    graph.updateData(result);
  }

  /**
   * Actualiza las tarjetas de resultados y el paso a paso
   */
  function updateResultsUI(res) {
    // Badge de tipo de sistema
    let badgeClass = 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300';
    let typeName = 'Compatible Determinado';

    if (res.systemType === 'parallel') {
      badgeClass = 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';
      typeName = res.isInequality ? 'Fronteras Paralelas' : 'Incompatible (Sin Solución)';
    } else if (res.systemType === 'coincident') {
      badgeClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';
      typeName = res.isInequality ? 'Fronteras Coincidentes' : 'Indeterminado (Infinitas Soluciones)';
    } else if (res.systemType === 'degenerate') {
      badgeClass = 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300';
      typeName = 'Ecuación Degenerada';
    }

    badgeSystemType.className = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeClass}`;
    badgeSystemType.textContent = typeName;

    // Coordenadas de corte
    if (res.solution) {
      cardSolution.classList.remove('hidden');
      textSolutionCoords.innerHTML = `P (x: <span class="text-blue-600 dark:text-blue-400 font-mono">${res.solution.xFraction}</span> ≈ ${res.solution.xFormatted}, y: <span class="text-purple-600 dark:text-purple-400 font-mono">${res.solution.yFraction}</span> ≈ ${res.solution.yFormatted})`;
      textSolutionDesc.textContent = res.description;
    } else {
      cardSolution.classList.add('hidden');
    }

    // Renderizar Paso a Paso
    renderSteps(res.steps);
  }

  /**
   * Renderiza el acordeón de pasos detallados
   */
  function renderSteps(steps) {
    stepsContainer.innerHTML = '';

    steps.forEach((step, index) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm transition-all duration-200';
      
      stepEl.innerHTML = `
        <button type="button" class="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-left font-semibold text-slate-800 dark:text-slate-200 text-sm focus:outline-none" data-accordion-btn>
          <span class="flex items-center gap-2">
            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-xs font-bold">${index + 1}</span>
            <span>${step.title}</span>
          </span>
          <svg class="w-4 h-4 text-slate-500 transform transition-transform duration-200 ${index === 0 || index === steps.length - 1 ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div class="p-4 border-t border-slate-200 dark:border-slate-700/60 ${index === 0 || index === steps.length - 1 ? '' : 'hidden'}" data-accordion-content>
          ${step.html}
        </div>
      `;

      // Toggle acordeón
      const btn = stepEl.querySelector('[data-accordion-btn]');
      const content = stepEl.querySelector('[data-accordion-content]');
      const icon = btn.querySelector('svg');

      btn.addEventListener('click', () => {
        const isHidden = content.classList.contains('hidden');
        if (isHidden) {
          content.classList.remove('hidden');
          icon.classList.add('rotate-180');
        } else {
          content.classList.add('hidden');
          icon.classList.remove('rotate-180');
        }
      });

      stepsContainer.appendChild(stepEl);
    });
  }

  // Escuchadores de eventos para todos los inputs y selectores
  [inA1, inB1, inOp1, inC1, inA2, inB2, inOp2, inC2].forEach(input => {
    input.addEventListener('input', updateSystem);
    input.addEventListener('change', updateSystem);
  });

  // Manejador de Presets
  const presetsData = {
    'unique': {
      eq1: { a: 2, b: 1, op: '=', c: 5 },
      eq2: { a: 1, b: -1, op: '=', c: 1 }
    },
    'inequalities': {
      eq1: { a: 1, b: 1, op: '<=', c: 4 },
      eq2: { a: 1, b: -1, op: '>=', c: 0 }
    },
    'bounded': {
      eq1: { a: 2, b: 1, op: '<=', c: 6 },
      eq2: { a: -1, b: 2, op: '<=', c: 4 }
    },
    'parallel': {
      eq1: { a: 2, b: 4, op: '=', c: 8 },
      eq2: { a: 1, b: 2, op: '=', c: 10 }
    },
    'coincident': {
      eq1: { a: 1, b: -1, op: '=', c: 2 },
      eq2: { a: 2, b: -2, op: '=', c: 4 }
    },
    'orthogonal': {
      eq1: { a: 1, b: 0, op: '=', c: 3 },
      eq2: { a: 0, b: 1, op: '=', c: 2 }
    }
  };

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const data = presetsData[presetKey];
      if (!data) return;

      inA1.value = data.eq1.a;
      inB1.value = data.eq1.b;
      inOp1.value = data.eq1.op;
      inC1.value = data.eq1.c;

      inA2.value = data.eq2.a;
      inB2.value = data.eq2.b;
      inOp2.value = data.eq2.op;
      inC2.value = data.eq2.c;

      updateSystem();
      graph.centerOnSolution();
    });
  });

  // Botones de control del gráfico
  btnZoomIn.addEventListener('click', () => graph.zoom(1));
  btnZoomOut.addEventListener('click', () => graph.zoom(-1));
  btnResetView.addEventListener('click', () => graph.resetView());
  btnCenterSol.addEventListener('click', () => graph.centerOnSolution());

  toggleGrid.addEventListener('change', (e) => {
    graph.showGrid = e.target.checked;
    graph.render();
  });

  toggleShading.addEventListener('change', (e) => {
    graph.showShading = e.target.checked;
    graph.render();
  });

  // Inicializar primera ejecución
  updateSystem();
  graph.centerOnSolution();
});
