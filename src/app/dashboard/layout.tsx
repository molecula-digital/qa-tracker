"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession, signOut, organization } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  FolderKanban,
  Settings,
  CreditCard,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronsUpDown,
  Plus,
  Building2,
  LogOut,
} from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const navItems = [
  { label: "Projects", href: "/dashboard", icon: FolderKanban },
  { label: "Team", href: "/dashboard/team", icon: Users },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
}

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
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [activeOrg, setActiveOrg] = useState<OrgInfo | null>(null);

  useEffect(() => {
    setCollapsed(isProjectPage);
  }, [isProjectPage]);

  // Load user's organizations
  const loadOrgs = useCallback(async () => {
    try {
      const result = await organization.list();
      if (result.data) {
        setOrgs(result.data as unknown as OrgInfo[]);
      }
    } catch {
      // silently fail
    }
  }, []);

  // Load active org details
  const loadActiveOrg = useCallback(async () => {
    if (!session?.session?.activeOrganizationId) return;
    try {
      const result = await organization.getFullOrganization();
      if (result.data) {
        setActiveOrg({
          id: result.data.id,
          name: result.data.name,
          slug: result.data.slug,
          logo: result.data.logo,
        });
      }
    } catch {
      // silently fail
    }
  }, [session?.session?.activeOrganizationId]);

  useEffect(() => {
    if (!isPending && session) {
      loadOrgs();
      loadActiveOrg();
    }
  }, [isPending, session, loadOrgs, loadActiveOrg]);

  useEffect(() => {
    if (isPending) return;
    if (
      session &&
      !session.user.onboardingFinished &&
      pathname !== "/dashboard/onboarding"
    ) {
      router.push("/dashboard/onboarding");
    }
  }, [session, isPending, pathname, router]);

  const handleSwitchOrg = async (orgId: string) => {
    await organization.setActive({ organizationId: orgId });
    window.location.reload();
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm font-mono">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={`${
          collapsed ? "w-14" : "w-60"
        } shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200 overflow-hidden`}
      >
        {/* Logo + toggle */}
        <div className={`flex flex-col items-center ${collapsed ? "py-3 gap-2" : "p-4"}`}>
          <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between w-full"}`}>
            <Link href="/dashboard" className="block">
              <span className="text-lg font-semibold text-foreground font-mono">
                {collapsed ? "R" : "Retrack"}
              </span>
            </Link>
            {!collapsed && (
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={16} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Expand sidebar"
            >
              <PanelLeftOpen size={14} />
            </button>
          )}
        </div>

        {/* Org switcher */}
        {!collapsed && activeOrg && (
          <div className="px-3 mb-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left hover:bg-accent/50 transition-colors group">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-accent text-foreground font-mono">
                      {activeOrg.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-foreground truncate">
                    {activeOrg.name}
                  </span>
                  <ChevronsUpDown size={12} className="text-muted-foreground shrink-0 group-hover:text-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  Switch workspace
                </p>
                {orgs.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                    className="gap-2"
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarFallback className="text-[9px] bg-accent text-foreground font-mono">
                        {org.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{org.name}</span>
                    {org.id === activeOrg.id && (
                      <span className="ml-auto text-emerald-500 text-xs">Active</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/onboarding")} className="gap-2">
                  <Plus size={14} />
                  Create workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {collapsed && activeOrg && (
          <div className="flex justify-center mb-2">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-[10px] bg-accent text-foreground font-mono">
                {activeOrg.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <Separator className="bg-sidebar-border mb-1" />

        {/* Nav */}
        <nav className="flex-1 px-2">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 w-full h-8 px-3 rounded-md text-sm transition-colors ${
                      collapsed ? "justify-center px-2" : ""
                    } ${
                      isActive
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    {!collapsed && (
                      <span>{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <Separator className="my-2 bg-sidebar-border" />

        {/* Theme switcher */}
        <div className={`${collapsed ? "flex justify-center" : "px-2"} mb-2`}>
          <ThemeSwitcher collapsed={collapsed} />
        </div>

        {/* User */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors group">
                <Avatar className="w-6 h-6 shrink-0">
                  <AvatarFallback className="text-[10px] bg-accent text-foreground">
                    {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground truncate flex-1 text-left">
                  {session?.user?.email}
                </span>
                <ChevronsUpDown size={12} className="text-muted-foreground shrink-0 group-hover:text-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await signOut();
                    router.push("/sign-in");
                  }}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut size={14} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {collapsed && (
          <div className="flex justify-center pb-3">
            <button
              onClick={async () => {
                await signOut();
                router.push("/sign-in");
              }}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 p-4 bg-background overflow-auto">
        {children}
      </main>
    </div>
  );
}
