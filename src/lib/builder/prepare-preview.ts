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
 * Construye el documento HTML autocontenido del sandbox de previsualización.
 * Usa React + Babel standalone vía CDN para transpilar y renderizar JSX
 * en tiempo real dentro del iframe, sin recargar la página anfitriona.
 */
export function buildPreviewHtml(rawCode: string): string {
  const { source, componentName } = prepareComponentSource(rawCode);
  const safeSource = source.replace(/<\/script>/g, "<\\/script>");

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
</body>
</html>`;
}
