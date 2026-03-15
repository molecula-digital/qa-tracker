"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Projects", href: "/dashboard" },
  { label: "Settings", href: "/dashboard/settings" },
  { label: "Billing", href: "/dashboard/billing" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();

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
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-neutral-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="w-60 shrink-0 border-r border-neutral-200 p-6 flex flex-col">
        <Link href="/dashboard" className="block mb-8">
          <span className="text-lg font-semibold text-neutral-900">
            Retrack
          </span>
        </Link>

        <nav className="flex-1">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      isActive
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600"
                    }`}
                    render={<Link href={item.href} />}
                  >
                    {item.label}
                  </Button>
                </li>
              );
            })}
          </ul>
        </nav>

        <Separator className="my-4" />

        <p className="text-xs text-neutral-400 px-3">
          {session?.user?.email}
        </p>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
