interface PreparedComponent {
  source: string;
  componentName: string;
}

/**
 * Normaliza el código de un componente React generado por la IA para poder
 * inyectarlo en un sandbox de iframe: elimina imports (el sandbox ya expone
 * React global) y resuelve el nombre del componente exportado por defecto.
 */
export function prepareComponentSource(raw: string): PreparedComponent {
  let code = raw.trim();
  code = code.replace(/^\s*import .*;?\s*$/gm, "");

  const namedFunctionMatch = code.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/);
  if (namedFunctionMatch) {
    code = code.replace(/export\s+default\s+function/, "function");
    return { source: code, componentName: namedFunctionMatch[1] };
  }

  const bareExportMatch = code.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;?\s*$/m);
  if (bareExportMatch) {
    code = code.replace(/export\s+default\s+[A-Za-z0-9_]+\s*;?\s*$/m, "");
    return { source: code, componentName: bareExportMatch[1] };
  }

  if (/export\s+default/.test(code)) {
    code = code.replace(/export\s+default/, "const GeneratedComponent =");
    return { source: code, componentName: "GeneratedComponent" };
  }

  return { source: code, componentName: "GeneratedComponent" };
}

/**
 * Script inyectado en el iframe cuando el click-to-edit está activo: captura
 * el clic sobre cualquier elemento con `data-vera-id` (inyectado por
 * `instrumentCode`), le pone el marco luminoso HUD y avisa al padre por
 * `postMessage` con su id y su posición — el padre no puede leer el DOM del
 * iframe directamente (origen aislado por el sandbox), así que toda la
 * comunicación bidireccional pasa por mensajes.
 */
const CLICK_TO_EDIT_SCRIPT = `
<script>
(function () {
  function clearSelection() {
    document.querySelectorAll('[data-vera-selected]').forEach(function (n) {
      n.removeAttribute('data-vera-selected');
      n.style.outline = '';
      n.style.boxShadow = '';
      n.style.outlineOffset = '';
    });
  }

  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el !== document.body && !el.hasAttribute('data-vera-id')) {
      el = el.parentElement;
    }
    if (!el || el === document.body) return;
    e.preventDefault();
    e.stopPropagation();
    clearSelection();
    el.setAttribute('data-vera-selected', 'true');
    el.style.outline = '2px solid #00f0ff';
    el.style.boxShadow = '0 0 10px rgba(0,240,255,0.5)';
    el.style.outlineOffset = '2px';
    var rect = el.getBoundingClientRect();
    window.parent.postMessage({
      type: 'vera:select',
      id: Number(el.getAttribute('data-vera-id')),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').trim().slice(0, 80),
      rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
    }, '*');
  }, true);

  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'vera:deselect') clearSelection();
  });
})();
</script>`;

/**
 * Construye el documento HTML autocontenido del sandbox de previsualización.
 * Usa React + Babel standalone vía CDN para transpilar y renderizar JSX
 * en tiempo real dentro del iframe, sin recargar la página anfitriona.
 */
export function buildPreviewHtml(rawCode: string, options?: { enableClickToEdit?: boolean }): string {
  const { source, componentName } = prepareComponentSource(rawCode);
  const safeSource = source.replace(/<\/script>/g, "<\\/script>");
  const clickToEditScript = options?.enableClickToEdit ? CLICK_TO_EDIT_SCRIPT : "";

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://cdn.tailwindcss.com"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
  html,body{margin:0;padding:0;background:#0b0f14;min-height:100%;}
  #preview-error{font-family:ui-monospace,monospace;color:#f87171;background:#1a0f10;padding:1rem;white-space:pre-wrap;font-size:12px;}
</style>
</head>
<body>
<div id="root"></div>
<div id="preview-error"></div>
<script type="text/babel" data-presets="react">
try {
  ${safeSource}

  const rootEl = document.getElementById("root");
  const root = ReactDOM.createRoot(rootEl);
  root.render(React.createElement(${componentName}));
} catch (err) {
  document.getElementById("preview-error").textContent = "Error al renderizar la vista previa:\\n" + (err && err.message ? err.message : String(err));
}
</script>
${clickToEditScript}
</body>
</html>`;
}
