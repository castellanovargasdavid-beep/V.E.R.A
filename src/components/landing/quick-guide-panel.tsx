const TIPS = [
  {
    title: "Habla o escribe",
    description: "Pulsa el micrófono o escribe tu idea; V.E.R.A la convierte en una web al instante.",
  },
  {
    title: "Mira la vista previa",
    description: "Lo que genera aparece al momento en el panel central, sin recargar la página.",
  },
  {
    title: "Sube tu logo y tus fotos",
    description: "Desde el Builder puedes cambiar los textos e imágenes de ejemplo por los tuyos.",
  },
  {
    title: "Conecta tu dominio",
    description: "Cuando quieras publicarlo de verdad, hazlo desde tu panel de control.",
  },
  {
    title: "Comparte en redes",
    description: "Pide copys para Instagram, TikTok o LinkedIn y V.E.R.A los adapta a cada plataforma.",
  },
];

/**
 * Panel HUD derecho: guía estática y en lenguaje sencillo para quien no
 * tiene conocimientos técnicos, con los pasos prácticos para llevar lo que
 * propone V.E.R.A hasta tenerlo publicado.
 */
export function QuickGuidePanel() {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-slate-900/40 p-4 backdrop-blur-md">
      <h2 className="mb-3 font-mono text-sm font-semibold text-amber-400">⚡ Quick Start / Fast Guide</h2>
      <ol className="space-y-3">
        {TIPS.map((tip, i) => (
          <li key={tip.title} className="flex gap-2.5">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-500/40 text-[0.6rem] font-semibold text-amber-400">
              {i + 1}
            </span>
            <div>
              <p className="text-xs font-semibold text-foreground/90">{tip.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{tip.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
