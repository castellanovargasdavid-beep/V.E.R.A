"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wand2, Share2, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/builder", label: "Builder", icon: Wand2 },
  { href: "/social", label: "Redes Sociales", icon: Share2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-background/60">
      <div className="flex items-center gap-2 border-b border-border px-5 py-5">
        <Cpu className="h-5 w-5 text-jarvis" />
        <span className="font-mono text-base font-bold tracking-wide">V.E.R.A</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-jarvis/10 text-jarvis"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-3 py-4 text-xs text-muted-foreground">
        Copiloto de IA para diseño web &amp; redes.
      </div>
    </aside>
  );
}
