"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FolderKanban,
  Settings,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Projects", href: "/dashboard", icon: FolderKanban },
  { label: "Team", href: "/dashboard/settings", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

  const isProjectPage = pathname.startsWith("/dashboard/projects/");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(isProjectPage);
  }, [isProjectPage]);

  useEffect(() => {
    if (isPending) return;
    if (
      session &&
      !session.session.activeOrganizationId &&
      pathname !== "/dashboard/onboarding"
    ) {
      router.push("/dashboard/onboarding");
    }
  }, [session, isPending, pathname, router]);

  if (isPending) {
    return (
      <div className="dark">
        <div className="flex min-h-screen items-center justify-center bg-neutral-950">
          <p className="text-neutral-500 text-sm font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dark">
      <div className="flex min-h-screen bg-neutral-900">
        <aside
          className={`${
            collapsed ? "w-14" : "w-60"
          } shrink-0 bg-neutral-950 border-r border-neutral-800 flex flex-col transition-all duration-200 overflow-hidden`}
        >
          <div className={`flex flex-col items-center ${collapsed ? 'py-3 gap-2' : 'p-4'}`}>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between w-full'}`}>
              <Link href="/dashboard" className="block">
                <span className="text-lg font-semibold text-neutral-100 font-mono">
                  {collapsed ? "R" : "Retrack"}
                </span>
              </Link>
              {!collapsed && (
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose size={16} />
                </button>
              )}
            </div>
            {collapsed && (
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
                title="Expand sidebar"
              >
                <PanelLeftOpen size={14} />
              </button>
            )}
          </div>

          <nav className="flex-1 px-2">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Button
                      variant="ghost"
                      className={`w-full ${
                        collapsed ? "justify-center px-2" : "justify-start"
                      } ${
                        isActive
                          ? "bg-neutral-800 text-neutral-100"
                          : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                      }`}
                      render={<Link href={item.href} />}
                    >
                      <Icon size={16} className="shrink-0" />
                      {!collapsed && (
                        <span className="ml-2 text-sm">{item.label}</span>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <Separator className="my-2 bg-neutral-800" />

          {!collapsed && (
            <p className="text-xs text-neutral-500 px-4 pb-4 truncate font-mono">
              {session?.user?.email}
            </p>
          )}
        </aside>

        <main className="flex-1 p-4 bg-neutral-900 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
