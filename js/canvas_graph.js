/**
 * canvas_graph.js
 * Motor de renderizado en HTML5 2D Canvas para el plano cartesiano interactivo.
 * Soporta zoom dinámico, paneo (arrastre), cuadrícula adaptativa,
 * trazado de rectas y sombreado vectorial exacto de semiplanos.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CanvasGraph = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class CartesianCanvas {
    constructor(canvasElement, options = {}) {
      this.canvas = canvasElement;
      this.ctx = this.canvas.getContext('2d');
      
      // Estado de la vista matemática
      this.centerX = options.centerX || 0;
      this.centerY = options.centerY || 0;
      this.scale = options.scale || 40; // píxeles por unidad matemática
      this.minScale = 10;
      this.maxScale = 200;

      // Preferencias visuales
      this.showGrid = true;
      this.showShading = true;
      this.showFeasibleOnly = false;
      this.isDark = false;

      // Interacción
      this.isDragging = false;
      this.dragStart = { x: 0, y: 0 };
      this.currentHoverMath = null;

      // Datos a renderizar
      this.systemData = null;

      this.initEvents();
      this.resize();
    }

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      this.width = rect.width || 600;
      this.height = rect.height || 500;

      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;

      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);

      this.render();
    }

    initEvents() {
      window.addEventListener('resize', () => this.resize());

      // Paneo con mouse
      this.canvas.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
      });

      window.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mouseCanvasX = e.clientX - rect.left;
        const mouseCanvasY = e.clientY - rect.top;

        if (mouseCanvasX >= 0 && mouseCanvasX <= this.width && mouseCanvasY >= 0 && mouseCanvasY <= this.height) {
          this.currentHoverMath = this.canvasToMath(mouseCanvasX, mouseCanvasY);
          if (typeof this.onHoverCoords === 'function') {
            this.onHoverCoords(this.currentHoverMath);
          }
        }

        if (!this.isDragging) return;
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        this.dragStart = { x: e.clientX, y: e.clientY };

        // Ajustar centro
        this.centerX -= dx / this.scale;
        this.centerY += dy / this.scale;

        this.render();
      });

      window.addEventListener('mouseup', () => {
        if (this.isDragging) {
          this.isDragging = false;
          this.canvas.style.cursor = 'crosshair';
        }
      });

      // Zoom con rueda del ratón centrado en el cursor
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const mathBefore = this.canvasToMath(mouseX, mouseY);

        const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
        const newScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

        if (newScale !== this.scale) {
          this.scale = newScale;
          // Re-centrar para que el punto bajo el ratón no se mueva
          this.centerX = mathBefore.x - (mouseX - this.width / 2) / this.scale;
          this.centerY = mathBefore.y + (mouseY - this.height / 2) / this.scale;
          this.render();
        }
      }, { passive: false });

      // Soporte táctil básico
      let touchStart = null;
      this.canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      }, { passive: true });

      this.canvas.addEventListener('touchmove', (e) => {
        if (touchStart && e.touches.length === 1) {
          const dx = e.touches[0].clientX - touchStart.x;
          const dy = e.touches[0].clientY - touchStart.y;
          touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          this.centerX -= dx / this.scale;
          this.centerY += dy / this.scale;
          this.render();
        }
      }, { passive: true });

      this.canvas.addEventListener('touchend', () => {
        touchStart = null;
      });
    }

    mathToCanvas(x, y) {
      return {
        cx: (this.width / 2) + ((x - this.centerX) * this.scale),
        cy: (this.height / 2) - ((y - this.centerY) * this.scale)
      };
    }

    canvasToMath(cx, cy) {
      return {
        x: this.centerX + ((cx - this.width / 2) / this.scale),
        y: this.centerY - ((cy - this.height / 2) / this.scale)
      };
    }

    getVisibleBounds() {
      const pTopLeft = this.canvasToMath(0, 0);
      const pBottomRight = this.canvasToMath(this.width, this.height);
      return {
        xMin: pTopLeft.x,
        xMax: pBottomRight.x,
        yMin: pBottomRight.y,
        yMax: pTopLeft.y
      };
    }

    zoom(delta) {
      const newScale = Math.min(Math.max(this.scale * (delta > 0 ? 1.25 : 0.8), this.minScale), this.maxScale);
      this.scale = newScale;
      this.render();
    }

    resetView() {
      this.centerX = 0;
      this.centerY = 0;
      this.scale = 40;
      this.render();
    }

    centerOnSolution() {
      if (this.systemData && this.systemData.solution) {
        this.centerX = this.systemData.solution.x;
        this.centerY = this.systemData.solution.y;
        this.render();
      } else {
        this.resetView();
      }
    }

    updateData(systemData) {
      this.systemData = systemData;
      this.render();
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      const bounds = this.getVisibleBounds();

      // 1. Dibujar Cuadrícula y Ejes
      if (this.showGrid) {
        this.drawGrid(bounds);
      }

      // 2. Dibujar Semiplanos e Intersección (Inecuaciones)
      if (this.showShading && this.systemData && this.systemData.isInequality) {
        this.drawHalfPlanes(bounds);
      }

      // 3. Dibujar Ejes X e Y prominentes
      this.drawAxes();

      // 4. Dibujar Rectas Frontera
      if (this.systemData) {
        this.drawLines(bounds);
      }

      // 5. Dibujar Punto de Intersección
      if (this.systemData && this.systemData.solution) {
        this.drawIntersectionPoint(this.systemData.solution);
      }
    }

    drawGrid(bounds) {
      const ctx = this.ctx;

      // Calcular paso dinámico para los números
      const targetPixelStep = 50;
      const rawStep = targetPixelStep / this.scale;
      const power = Math.pow(10, Math.floor(Math.log10(rawStep)));
      let step = power;
      if (rawStep / power >= 5) step = 5 * power;
      else if (rawStep / power >= 2) step = 2 * power;

      const firstX = Math.floor(bounds.xMin / step) * step;
      const lastX = Math.ceil(bounds.xMax / step) * step;
      const firstY = Math.floor(bounds.yMin / step) * step;
      const lastY = Math.ceil(bounds.yMax / step) * step;

      // Líneas de cuadrícula
      ctx.lineWidth = 1;
      ctx.strokeStyle = this.isDark ? '#334155' : '#f1f5f9';

      ctx.beginPath();
      for (let x = firstX; x <= lastX; x += step) {
        const { cx } = this.mathToCanvas(x, 0);
        ctx.moveTo(cx, 0);
        ctx.lineTo(cx, this.height);
      }
      for (let y = firstY; y <= lastY; y += step) {
        const { cy } = this.mathToCanvas(0, y);
        ctx.moveTo(0, cy);
        ctx.lineTo(this.width, cy);
      }
      ctx.stroke();

      // Subcuadrícula sutil
      ctx.strokeStyle = this.isDark ? '#1e293b' : '#e2e8f0';
      ctx.stroke();

      // Etiquetas numéricas
      ctx.fillStyle = this.isDark ? '#94a3b8' : '#64748b';
      ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const origin = this.mathToCanvas(0, 0);
      const axisYClamped = Math.max(15, Math.min(this.height - 20, origin.cy));
      const axisXClamped = Math.max(25, Math.min(this.width - 25, origin.cx));

      // Números en eje X
      for (let x = firstX; x <= lastX; x += step) {
        if (Math.abs(x) < 1e-6) continue;
        const { cx } = this.mathToCanvas(x, 0);
        const label = Math.abs(step) < 1 ? x.toFixed(1) : `${Math.round(x)}`;
        ctx.fillText(label, cx, axisYClamped + 4);
      }

      // Números en eje Y
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (let y = firstY; y <= lastY; y += step) {
        if (Math.abs(y) < 1e-6) continue;
        const { cy } = this.mathToCanvas(0, y);
        const label = Math.abs(step) < 1 ? y.toFixed(1) : `${Math.round(y)}`;
        ctx.fillText(label, axisXClamped - 6, cy);
      }
    }

    drawAxes() {
      const ctx = this.ctx;
      const origin = this.mathToCanvas(0, 0);

      ctx.save();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = this.isDark ? '#64748b' : '#475569';

      // Eje X
      ctx.beginPath();
      ctx.moveTo(0, origin.cy);
      ctx.lineTo(this.width, origin.cy);
      ctx.stroke();

      // Eje Y
      ctx.beginPath();
      ctx.moveTo(origin.cx, 0);
      ctx.lineTo(origin.cx, this.height);
      ctx.stroke();

      // Flechas
      const arrowSize = 6;
      // Flecha X
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(this.width, origin.cy);
      ctx.lineTo(this.width - arrowSize * 1.5, origin.cy - arrowSize);
      ctx.lineTo(this.width - arrowSize * 1.5, origin.cy + arrowSize);
      ctx.closePath();
      ctx.fill();

      // Flecha Y
      ctx.beginPath();
      ctx.moveTo(origin.cx, 0);
      ctx.lineTo(origin.cx - arrowSize, arrowSize * 1.5);
      ctx.lineTo(origin.cx + arrowSize, arrowSize * 1.5);
      ctx.closePath();
      ctx.fill();

      // Etiquetas de ejes 'X' e 'Y'
      ctx.font = 'bold 12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillText('X', this.width - 14, Math.max(16, origin.cy - 10));
      ctx.fillText('Y', Math.max(14, origin.cx + 12), 14);

      ctx.restore();
    }

    drawHalfPlanes(bounds) {
      if (!window.MathEngine) return;
      const ctx = this.ctx;
      const eq1 = this.systemData.eq1;
      const eq2 = this.systemData.eq2;

      // Polígono base: rectángulo del viewport visible
      const basePolygon = [
        { x: bounds.xMin - 1, y: bounds.yMin - 1 },
        { x: bounds.xMax + 1, y: bounds.yMin - 1 },
        { x: bounds.xMax + 1, y: bounds.yMax + 1 },
        { x: bounds.xMin - 1, y: bounds.yMax + 1 }
      ];

      // 1. Semiplano Inecuación 1 (Azul translúcido)
      if (eq1.op !== '=' && !this.showFeasibleOnly) {
        const poly1 = window.MathEngine.clipPolygonWithHalfPlane(basePolygon, eq1.a, eq1.b, eq1.op, eq1.c);
        if (poly1.length >= 3) {
          ctx.save();
          ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; // Azul 500 al 15%
          this.renderPolygon(poly1);
          ctx.fill();
          ctx.restore();
        }
      }

      // 2. Semiplano Inecuación 2 (Púrpura translúcido)
      if (eq2.op !== '=' && !this.showFeasibleOnly) {
        const poly2 = window.MathEngine.clipPolygonWithHalfPlane(basePolygon, eq2.a, eq2.b, eq2.op, eq2.c);
        if (poly2.length >= 3) {
          ctx.save();
          ctx.fillStyle = 'rgba(168, 85, 247, 0.15)'; // Púrpura 500 al 15%
          this.renderPolygon(poly2);
          ctx.fill();
          ctx.restore();
        }
      }

      // 3. Región Factible (Intersección de ambos semiplanos)
      if (eq1.op !== '=' && eq2.op !== '=') {
        const clipped1 = window.MathEngine.clipPolygonWithHalfPlane(basePolygon, eq1.a, eq1.b, eq1.op, eq1.c);
        const feasiblePolygon = window.MathEngine.clipPolygonWithHalfPlane(clipped1, eq2.a, eq2.b, eq2.op, eq2.c);

        if (feasiblePolygon.length >= 3) {
          ctx.save();
          // Relleno esmeralda enriquecido para la región común
          ctx.fillStyle = 'rgba(16, 185, 129, 0.32)'; // Esmeralda
          this.renderPolygon(feasiblePolygon);
          ctx.fill();

          // Borde punteado fino de la región factible
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = 'rgba(5, 150, 105, 0.6)';
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }
      }
    }

    renderPolygon(polygon) {
      const ctx = this.ctx;
      ctx.beginPath();
      for (let i = 0; i < polygon.length; i++) {
        const p = this.mathToCanvas(polygon[i].x, polygon[i].y);
        if (i === 0) ctx.moveTo(p.cx, p.cy);
        else ctx.lineTo(p.cx, p.cy);
      }
      ctx.closePath();
    }

    drawLines(bounds) {
      const ctx = this.ctx;
      const eq1 = this.systemData.eq1;
      const eq2 = this.systemData.eq2;

      // Línea 1 (Azul)
      this.drawLineEquation(eq1, {
        color: '#2563eb', // blue-600
        width: 2.8,
        dashed: eq1.op === '<' || eq1.op === '>'
      }, bounds);

      // Línea 2 (Púrpura)
      this.drawLineEquation(eq2, {
        color: '#9333ea', // purple-600
        width: 2.8,
        dashed: eq2.op === '<' || eq2.op === '>'
      }, bounds);
    }

    drawLineEquation(eq, style, bounds) {
      const a = Number(eq.a) || 0;
      const b = Number(eq.b) || 0;
      const c = Number(eq.c) || 0;

      if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) return;

      const ctx = this.ctx;
      ctx.save();
      ctx.strokeStyle = style.color;
      ctx.lineWidth = style.width;
      if (style.dashed) {
        ctx.setLineDash([8, 6]);
      } else {
        ctx.setLineDash([]);
      }

      let p1, p2;

      // Recta vertical: a*x = c => x = c / a
      if (Math.abs(b) < 1e-9) {
        const x = c / a;
        p1 = this.mathToCanvas(x, bounds.yMin - 10);
        p2 = this.mathToCanvas(x, bounds.yMax + 10);
      } 
      // Recta no vertical: y = (c - a*x) / b
      else {
        const xStart = bounds.xMin - 10;
        const xEnd = bounds.xMax + 10;
        const yStart = (c - (a * xStart)) / b;
        const yEnd = (c - (a * xEnd)) / b;
        p1 = this.mathToCanvas(xStart, yStart);
        p2 = this.mathToCanvas(xEnd, yEnd);
      }

      ctx.beginPath();
      ctx.moveTo(p1.cx, p1.cy);
      ctx.lineTo(p2.cx, p2.cy);
      ctx.stroke();
      ctx.restore();
    }

    drawIntersectionPoint(sol) {
      const ctx = this.ctx;
      const { cx, cy } = this.mathToCanvas(sol.x, sol.y);

      // Fuera del canvas visible
      if (cx < -50 || cx > this.width + 50 || cy < -50 || cy > this.height + 50) return;

      ctx.save();

      // Halo pulsante exterior
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fill();

      // Círculo intermedio
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#dc2626'; // red-600
      ctx.fill();

      // Centro blanco
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Etiqueta flotante con coordenadas
      const label = `P (${sol.xFraction}, ${sol.yFraction})`;
      ctx.font = 'bold 11px ui-sans-serif, system-ui, sans-serif';
      const textMetrics = ctx.measureText(label);
      const boxWidth = textMetrics.width + 16;
      const boxHeight = 24;

      const tagX = cx + 12;
      const tagY = cy - 28;

      // Caja fondo
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tagX, tagY, boxWidth, boxHeight, 6) : ctx.rect(tagX, tagY, boxWidth, boxHeight);
      ctx.fill();

      // Texto de coordenadas
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tagX + 8, tagY + (boxHeight / 2));

      ctx.restore();
    }
  }

  return CartesianCanvas;
}));
