import type { ProjectSummary } from "@/types/project";
import type { DashboardMetrics } from "@/types/metrics";
import type { ChatMessage } from "@/types/chat";
import type { SocialCampaign } from "@/types/prompt";

/**
 * Datos simulados usados cuando NEXT_PUBLIC_SUPABASE_URL / ANON_KEY o
 * ANTHROPIC_API_KEY no están configuradas, para que la app sea 100%
 * navegable desde el primer segundo sin romper el build ni requerir
 * servicios externos.
 */

export const MOCK_USER = {
  id: "mock-user-0001",
  email: "demo@vera.ai",
  fullName: "Usuario Demo",
};

export const MOCK_PROJECTS: ProjectSummary[] = [
  {
    id: "proj_landing_saas",
    name: "Landing — SaaS Fintech",
    status: "ready",
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    visits: 1284,
    conversionRate: 4.2,
  },
  {
    id: "proj_ecommerce_moda",
    name: "Tienda — Moda Urbana",
    status: "generating",
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    visits: 342,
    conversionRate: 2.1,
  },
  {
    id: "proj_portfolio_estudio",
    name: "Portfolio — Estudio Creativo",
    status: "published",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    visits: 5921,
    conversionRate: 6.8,
  },
  {
    id: "proj_landing_gimnasio",
    name: "Landing — Gimnasio Fit24",
    status: "draft",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    visits: 0,
    conversionRate: 0,
  },
];

export const MOCK_METRICS: DashboardMetrics = {
  totalProjects: MOCK_PROJECTS.length,
  totalGenerations: 187,
  activeUsersToday: 12,
  averageBuildTimeSeconds: 8.4,
  visitsTrend: Array.from({ length: 7 }).map((_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
    value: Math.round(300 + Math.random() * 900),
  })),
  generationsByModel: {
    fast: 142,
    reasoning: 45,
  },
};

export const MOCK_CHAT_HISTORY: ChatMessage[] = [
  {
    id: "msg_1",
    role: "assistant",
    content:
      "Sistemas en línea. Soy V.E.R.A, tu copiloto de diseño. Describe qué quieres construir y lo materializo al instante.",
    createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    modelUsed: "fast",
  },
];

export const MOCK_SOCIAL_CAMPAIGN: SocialCampaign = {
  sourceSummary: "Landing page para lanzamiento de app de finanzas personales.",
  generatedAt: new Date().toISOString(),
  posts: [
    {
      platform: "instagram",
      headline: "Tus finanzas, en piloto automático 🚀",
      caption:
        "Controla tus gastos, ahorra sin esfuerzo y alcanza tus metas. Nuestra nueva app ya está aquí ✨",
      hashtags: ["#FinanzasPersonales", "#Ahorro", "#Fintech", "#AppNueva"],
      callToAction: "Descárgala gratis, link en bio",
    },
    {
      platform: "tiktok",
      headline: "POV: dejas de estresarte por tu cuenta bancaria",
      caption:
        "3 segundos para ver en qué se te va el dinero. Así de fácil es con nuestra app 💸",
      hashtags: ["#DineroTok", "#FinanzasApp", "#ParaTi"],
      callToAction: "Prueba el link en nuestra bio",
      script: {
        hook: "Cámara en mano, cara seria: \"Si no sabes en qué se te fue el sueldo este mes, para de scrollear.\"",
        retention:
          "Corte a pantalla del móvil abriendo la app: se ve el gasto total del mes desglosado por categorías en tiempo real. Voz en off: \"Esto tardó 3 segundos, sin hojas de cálculo, sin bancos raros.\" Corte rápido mostrando cómo se crea una meta de ahorro con un par de toques.",
        cta: "A cámara, directo: \"Link en la bio, pruébala gratis antes de que llegue tu próxima nómina.\"",
      },
    },
    {
      platform: "linkedin",
      headline: "Lanzamos una nueva forma de gestionar las finanzas personales",
      caption:
        "Tras meses de desarrollo, presentamos una plataforma que combina IA y UX simple para ayudar a miles de usuarios a tomar mejores decisiones financieras.",
      hashtags: ["#Fintech", "#Innovacion", "#ProductLaunch"],
      callToAction: "Conoce más en el enlace",
    },
  ],
};

export const MOCK_STARTER_CODE = `export default function GeneratedComponent() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
      color: "white",
      fontFamily: "sans-serif",
      textAlign: "center",
      padding: "2rem",
    }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1rem" }}>
        Bienvenido a tu nuevo sitio
      </h1>
      <p style={{ maxWidth: 480, opacity: 0.9 }}>
        Describe cambios en el chat y V.E.R.A actualizará esta vista previa en tiempo real.
      </p>
    </div>
  );
}
`;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}
