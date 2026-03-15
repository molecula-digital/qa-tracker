# Phase 5: Landing Page + Design System Update

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished Apple-like landing page for Retrack. Update the color system to white/black with accent colors. No gradients.

**Architecture:** Landing page as a Next.js server component at `/`. Sections: Hero, Features, Pricing, CTA, Footer. Framer Motion for scroll animations. Shared design tokens in CSS variables.

**Tech Stack:** Next.js, Framer Motion, Tailwind CSS, Lucide React

---

## File Structure

```
src/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                  # Landing page
│   │   ├── layout.tsx                # Marketing layout (nav + footer)
│   │   └── _components/
│   │       ├── Navbar.tsx            # Top navigation
│   │       ├── Hero.tsx              # Hero section
│   │       ├── Features.tsx          # Features grid
│   │       ├── Pricing.tsx           # Pricing cards
│   │       ├── CTA.tsx               # Final call to action
│   │       └── Footer.tsx            # Footer
├── index.css                         # Updated design tokens
```

---

### Task 1: Update Design Tokens

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Update CSS variables in `src/index.css`**

Replace the existing `:root` variables with the new white/black + accent system:

```css
@import "tailwindcss";

@theme {
  --color-bg: #ffffff;
  --color-surface: #fafafa;
  --color-border: #e5e5e5;
  --color-text: #0a0a0a;
  --color-muted: #737373;
  --color-accent: #7a8c5c;
  --color-accent-light: #e8eee0;
  --color-danger: #dc2626;
  --font-sans: "Bricolage Grotesque", system-ui, sans-serif;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "chore: update design tokens to white/black + accent"
```

---

### Task 2: Create Marketing Layout

**Files:**
- Create: `src/app/(marketing)/layout.tsx`, `src/app/(marketing)/_components/Navbar.tsx`, `src/app/(marketing)/_components/Footer.tsx`

- [ ] **Step 1: Create Navbar `src/app/(marketing)/_components/Navbar.tsx`**

```tsx
// src/app/(marketing)/_components/Navbar.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Retrack
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-neutral-600 hover:text-neutral-900">
            Features
          </a>
          <a href="#pricing" className="text-sm text-neutral-600 hover:text-neutral-900">
            Pricing
          </a>
          <Link href="/sign-in" className="text-sm text-neutral-600 hover:text-neutral-900">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm px-4 py-2 bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors"
          >
            Get started
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden text-neutral-600"
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-white px-6 py-4 space-y-3">
          <a href="#features" className="block text-sm text-neutral-600">Features</a>
          <a href="#pricing" className="block text-sm text-neutral-600">Pricing</a>
          <Link href="/sign-in" className="block text-sm text-neutral-600">Sign in</Link>
          <Link href="/sign-up" className="block text-sm text-neutral-900 font-medium">Get started</Link>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Create Footer `src/app/(marketing)/_components/Footer.tsx`**

```tsx
// src/app/(marketing)/_components/Footer.tsx
export function Footer() {
  return (
    <footer className="border-t border-neutral-200 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-sm text-neutral-500">
          &copy; {new Date().getFullYear()} Retrack. All rights reserved.
        </div>
        <div className="flex gap-6 text-sm text-neutral-500">
          <a href="#" className="hover:text-neutral-900">Privacy</a>
          <a href="#" className="hover:text-neutral-900">Terms</a>
          <a href="#" className="hover:text-neutral-900">Contact</a>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create marketing layout `src/app/(marketing)/layout.tsx`**

```tsx
// src/app/(marketing)/layout.tsx
import { Navbar } from "./_components/Navbar";
import { Footer } from "./_components/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-16">{children}</main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add marketing layout with navbar and footer"
```

---

### Task 3: Build Hero Section

**Files:**
- Create: `src/app/(marketing)/_components/Hero.tsx`

- [ ] **Step 1: Create Hero `src/app/(marketing)/_components/Hero.tsx`**

```tsx
// src/app/(marketing)/_components/Hero.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
        >
          Track every test.
          <br />
          Ship with confidence.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto"
        >
          The real-time test matrix for QA teams. Organize, track, and
          collaborate on release testing — all in one kanban board.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex items-center justify-center gap-4"
        >
          <Link
            href="/sign-up"
            className="px-8 py-3 bg-neutral-900 text-white rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Get started free
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3 border border-neutral-300 rounded-full text-sm font-medium hover:border-neutral-400 transition-colors"
          >
            Sign in
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-20 border border-neutral-200 rounded-2xl overflow-hidden shadow-2xl shadow-neutral-200/50"
        >
          {/* Product screenshot placeholder */}
          <div className="aspect-video bg-neutral-50 flex items-center justify-center">
            <p className="text-neutral-400 text-sm">Product screenshot</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add hero section with framer motion animations"
```

---

### Task 4: Build Features Section

**Files:**
- Create: `src/app/(marketing)/_components/Features.tsx`

- [ ] **Step 1: Create Features `src/app/(marketing)/_components/Features.tsx`**

```tsx
// src/app/(marketing)/_components/Features.tsx
"use client";

import { motion } from "framer-motion";
import { Kanban, Users, Zap, Shield } from "lucide-react";

const features = [
  {
    icon: Kanban,
    title: "Kanban test matrix",
    description:
      "Organize test cases into columns by phase, priority, or platform. Drag, check, and track progress at a glance.",
  },
  {
    icon: Zap,
    title: "Real-time collaboration",
    description:
      "See changes the moment they happen. When a teammate checks off a test, your board updates instantly.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Create workspaces, invite your team, and manage roles. Everyone stays aligned on what's tested and what's not.",
  },
  {
    icon: Shield,
    title: "Release with confidence",
    description:
      "Track progress across releases with clear stats. Know exactly where you stand before every deploy.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-32 px-6 bg-neutral-50">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Everything your QA team needs
          </h2>
          <p className="mt-4 text-neutral-500 max-w-xl mx-auto">
            Simple, focused tools that get out of your way and let you ship.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-8 bg-white border border-neutral-200 rounded-2xl"
            >
              <feature.icon className="w-6 h-6 text-neutral-900 mb-4" strokeWidth={1.5} />
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add features section"
```

---

### Task 5: Build Pricing Section

**Files:**
- Create: `src/app/(marketing)/_components/Pricing.tsx`

- [ ] **Step 1: Create Pricing `src/app/(marketing)/_components/Pricing.tsx`**

```tsx
// src/app/(marketing)/_components/Pricing.tsx
"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals getting started",
    features: [
      "1 team member",
      "2 projects",
      "5 sections per project",
      "Community support",
    ],
    cta: "Get started",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$19",
    period: "/month",
    description: "For small QA teams",
    features: [
      "Up to 3 team members",
      "10 projects",
      "Unlimited sections",
      "Real-time collaboration",
      "Email support",
    ],
    cta: "Start free trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$49",
    period: "/month",
    description: "For scaling teams",
    features: [
      "Up to 15 team members",
      "Unlimited projects",
      "Unlimited sections",
      "SSO integration",
      "Priority support",
      "$5/mo per extra member",
    ],
    cta: "Contact sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-neutral-500">
            Start free. Upgrade when your team grows.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`p-8 rounded-2xl border ${
                plan.highlighted
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-200"
              }`}
            >
              <h3 className="text-lg font-bold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-neutral-500 text-sm">{plan.period}</span>
              </div>
              <p className="mt-2 text-sm text-neutral-500">{plan.description}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 mt-0.5 text-neutral-900 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-up"
                className={`mt-8 block text-center py-3 rounded-full text-sm font-medium transition-colors ${
                  plan.highlighted
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "border border-neutral-300 hover:border-neutral-400"
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: add pricing section"
```

---

### Task 6: Build CTA Section and Assemble Landing Page

**Files:**
- Create: `src/app/(marketing)/_components/CTA.tsx`
- Modify: `src/app/(marketing)/page.tsx`

- [ ] **Step 1: Create CTA `src/app/(marketing)/_components/CTA.tsx`**

```tsx
// src/app/(marketing)/_components/CTA.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export function CTA() {
  return (
    <section className="py-32 px-6 bg-neutral-900 text-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl md:text-4xl font-bold">
          Ready to ship with confidence?
        </h2>
        <p className="mt-4 text-neutral-400 max-w-xl mx-auto">
          Join teams that track every test, catch every bug, and never miss a
          release blocker again.
        </p>
        <Link
          href="/sign-up"
          className="mt-8 inline-block px-8 py-3 bg-white text-neutral-900 rounded-full text-sm font-medium hover:bg-neutral-100 transition-colors"
        >
          Get started free
        </Link>
      </motion.div>
    </section>
  );
}
```

- [ ] **Step 2: Assemble landing page `src/app/(marketing)/page.tsx`**

```tsx
// src/app/(marketing)/page.tsx
import { Hero } from "./_components/Hero";
import { Features } from "./_components/Features";
import { Pricing } from "./_components/Pricing";
import { CTA } from "./_components/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <CTA />
    </>
  );
}
```

- [ ] **Step 3: Verify landing page renders**

```bash
pnpm dev
```

Visit `http://localhost:3000/` — should show complete landing page with all sections.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: complete landing page with hero, features, pricing, cta"
```
