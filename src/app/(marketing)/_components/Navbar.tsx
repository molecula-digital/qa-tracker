"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
        <a href="/" className="text-xl font-bold tracking-tight text-neutral-900">
          Retrack
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Pricing
          </a>
          <a href="/sign-in" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Sign in
          </a>
          <a
            href="/sign-up"
            className="text-sm bg-neutral-900 text-white px-5 py-2 rounded-full hover:bg-neutral-800 transition-colors"
          >
            Get started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-neutral-900"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 pb-6 pt-4 flex flex-col gap-4">
          <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Features
          </a>
          <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Pricing
          </a>
          <a href="/sign-in" className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors">
            Sign in
          </a>
          <a
            href="/sign-up"
            className="text-sm bg-neutral-900 text-white px-5 py-2 rounded-full text-center hover:bg-neutral-800 transition-colors"
          >
            Get started
          </a>
        </div>
      )}
    </nav>
  );
}
