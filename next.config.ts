import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Compresión gzip del servidor integrado (`next start`). Es el valor por
  // defecto de Next.js — se deja explícito porque documenta la intención,
  // pero no reduce el tamaño del bundle: eso lo hacen el code-splitting
  // (dynamic import de VeraCore) y el tree-shaking de abajo.
  compress: true,
  experimental: {
    // Reescribe imports nombrados de estos paquetes a imports profundos por
    // módulo automáticamente, para que el bundler nunca retenga más de lo
    // que realmente se usa — sobre todo relevante para lucide-react (cientos
    // de iconos) y three.js (superficie enorme, aunque aquí ya se usan
    // imports nombrados a mano en VeraCore.tsx).
    optimizePackageImports: ["three", "lucide-react"],
  },
};

export default nextConfig;
