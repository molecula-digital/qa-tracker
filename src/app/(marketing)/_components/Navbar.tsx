"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-neutral-900">
          Retrack
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Pricing
          </a>
          <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/sign-up" />}>
            Get started
          </Button>
        </div>

        {/* Mobile hamburger */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 pb-6 pt-4 flex flex-col gap-3">
          <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Pricing
          </a>
          <Button variant="ghost" size="sm" className="justify-start" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          <Button size="sm" render={<Link href="/sign-up" />}>
            Get started
          </Button>
        </div>
      )}
    </nav>
  );
}
