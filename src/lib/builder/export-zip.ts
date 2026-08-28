const PACKAGE_JSON = `{
  "name": "vera-generated-project",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "15.5.24",
    "react": "19.2.8",
    "react-dom": "19.2.8"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.7",
    "@types/react-dom": "^19.0.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.3"
  }
}
`;

const NEXT_CONFIG = `/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = nextConfig;
`;

const TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;

const POSTCSS_CONFIG = `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

const TAILWIND_CONFIG = `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`;

const GITIGNORE = `node_modules
.next
out
*.log
.env*.local
`;

const GLOBALS_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;

const LAYOUT_TSX = `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proyecto generado con V.E.R.A",
  description: "Interfaz generada automáticamente por V.E.R.A.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
`;

const PAGE_TSX = `import GeneratedComponent from "@/components/GeneratedComponent";

export default function Page() {
  return <GeneratedComponent />;
}
`;

const README = `# Proyecto generado con V.E.R.A

Este proyecto fue exportado desde V.E.R.A y está listo para producción (Next.js 15 + Tailwind CSS).

## Empezar en local

\`\`\`bash
npm install
npm run dev
\`\`\`

## Build de producción

\`\`\`bash
npm run build
npm start
\`\`\`

El componente generado vive en \`src/components/GeneratedComponent.tsx\` — edítalo libremente,
es un componente React normal con Tailwind.
`;

function buildGeneratedComponentFile(code: string): string {
  const trimmed = code.trim();
  // "use client" por delante: no sabemos si el componente generado usa hooks
  // (useState, etc.), así que se marca como Client Component por seguridad
  // — no tiene coste si el componente termina siendo estático.
  return `"use client";\n\n${trimmed}\n`;
}

/**
 * Empaqueta el componente generado dentro de un proyecto Next.js + Tailwind
 * mínimo pero completo (listo para `npm install && npm run build`). jszip
 * se importa de forma perezosa desde el propio botón de descarga para no
 * añadir peso al bundle inicial de la app.
 */
export async function buildProjectZip(code: string): Promise<Blob> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  zip.file("package.json", PACKAGE_JSON);
  zip.file("next.config.js", NEXT_CONFIG);
  zip.file("tsconfig.json", TSCONFIG);
  zip.file("postcss.config.js", POSTCSS_CONFIG);
  zip.file("tailwind.config.ts", TAILWIND_CONFIG);
  zip.file(".gitignore", GITIGNORE);
  zip.file("README.md", README);
  zip.file("src/app/layout.tsx", LAYOUT_TSX);
  zip.file("src/app/globals.css", GLOBALS_CSS);
  zip.file("src/app/page.tsx", PAGE_TSX);
  zip.file("src/components/GeneratedComponent.tsx", buildGeneratedComponentFile(code));

  return zip.generateAsync({ type: "blob" });
}

/** Dispara la descarga del blob en el navegador y libera la URL temporal. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
