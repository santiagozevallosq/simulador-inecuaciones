# Simulador Interactivo de Ecuaciones e Inecuaciones Lineales (2x2)

Herramienta analítica, interactiva y pedagógica para resolver, graficar en tiempo real y explicar paso a paso sistemas de 2 ecuaciones o inecuaciones lineales con dos incógnitas.

## Características Principales

1. **Soporte Completo para Ecuaciones e Inecuaciones**:
   - Operadores soportados: `=`, `≤`, `≥`, `<` (estricto), `>` (estricto).
   - Detección automática de tipo de sistema:
     - *Compatible Determinado*: Solución única con coordenadas exactas en fracción y decimal.
     - *Incompatible*: Rectas paralelas no coincidentes.
     - *Indeterminado*: Rectas coincidentes (infinitas soluciones).
     - *Inecuaciones*: Sombreado de semiplanos y resaltado de la **Región Factible (Intersección)**.
2. **Plano Cartesiano 2D Interactivo**:
   - Renderizado con HTML5 Canvas sin librerías externas pesadas.
   - Paneo (arrastre de vista) y Zoom dinámico centrado en el cursor.
   - Botones de control rápido: Zoom In/Out, volver al origen `(0,0)` y centrar en la solución `P(x,y)`.
   - Algoritmo vectorial de recorte (Sutherland-Hodgman) para sombreado matemático exacto.
   - Medición en vivo de coordenadas `(x, y)` al pasar el cursor y detección de pertenencia a la región factible.
3. **Desglose Paso a Paso**:
   - Planteamiento formal del sistema.
   - Cálculo explícito de determinantes (&Delta;, &Delta;<sub>x</sub>, &Delta;<sub>y</sub>) mediante la Regla de Cramer.
   - Justificación de trazado de fronteras (línea continua para `≤, ≥` vs punteada para `<, >`).
   - Verificación de semiplanos usando el punto de prueba `(0,0)` o punto auxiliar.
4. **Presets Rápidos**:
   - Región factible acotada.
   - Solución única nominal.
   - Rectas paralelas.
   - Rectas coincidentes.
   - Rectas ortogonales (vertical y horizontal).

## Estructura del Proyecto

```text
20260920 simulador inecuaciones/
├── index.html            # Interfaz principal con TailwindCSS
├── css/
│   └── styles.css        # Tipografías y ajustes visuales
├── js/
│   ├── math_engine.js    # Motor matemático 100% desacoplado (Cramer, semiplanos, pasos)
│   ├── canvas_graph.js   # Renderizador del plano cartesiano 2D en Canvas
│   └── app.js            # Controlador UI y vinculación de eventos
├── test/
│   └── run_tests.js      # Suite de pruebas unitarias automáticas (QA)
└── README.md
```

## Cómo Ejecutar

Basta con abrir el archivo `index.html` en cualquier navegador web moderno (Chrome, Edge, Firefox, Safari). No requiere servidores locales ni instalaciones adicionales.
