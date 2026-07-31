"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenLine,
  ImageIcon,
  Layers,
  Library,
  Settings,
  BarChart3,
  Bot,
  KeyRound,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV: NavItem[] = [
  { title: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { title: "AI Copy", href: "/dashboard/generate/copy", icon: PenLine, badge: "AI" },
  { title: "AI Image", href: "/dashboard/generate/image", icon: ImageIcon, badge: "AI" },
  { title: "Brand Kit", href: "/dashboard/brand-kit", icon: Layers },
  { title: "Asset Library", href: "/dashboard/assets", icon: Library },
  { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { title: "Agents", href: "/dashboard/agents", icon: Bot, badge: "Soon" },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-background md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-white to-zinc-400">
            <div className="h-2.5 w-2.5 rounded-sm bg-zinc-950" />
          </div>
          <span>Atlas</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
              isActive(item.href)
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <item.icon className="h-4 w-4" />
              {item.title}
            </span>
            {item.badge && (
              <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Settings
        </p>
        <div className="space-y-0.5">
          <Link
            href="/dashboard/settings"
            className={cn(
              "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Settings className="h-4 w-4" />
              Overview
            </span>
          </Link>
          <Link
            href="/dashboard/settings/api-keys"
            className={cn(
              "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
              pathname.startsWith("/dashboard/settings/api-keys")
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <KeyRound className="h-4 w-4" />
              API keys
            </span>
          </Link>
          <Link
            href="/dashboard/settings/usage"
            className={cn(
              "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
              pathname.startsWith("/dashboard/settings/usage")
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <BarChart3 className="h-4 w-4" />
              Usage & caps
            </span>
          </Link>
          <Link
            href="/dashboard/personas"
            className={cn(
              "flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors",
              pathname.startsWith("/dashboard/personas")
                ? "bg-secondary font-medium text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-2.5">
              <Users className="h-4 w-4" />
              Personas
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
