"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0, 0, 0.2, 1] as const },
  }),
};

const quickWins = [
  "Real-time sync",
  "No spreadsheets",
  "Ship faster",
];

export function Hero() {
  return (
    <section className="py-28 md:py-44 px-6 relative overflow-hidden">
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 -z-10 bg-[image:radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

      <div className="mx-auto max-w-5xl text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          <Badge variant="outline" className="mb-6 px-3 py-1 text-xs font-mono tracking-wide">
            Built for QA teams
          </Badge>
        </motion.div>

        <motion.h1
          className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tighter text-foreground leading-[0.95]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          Track every test.
          <br />
          <span className="text-muted-foreground">Ship with confidence.</span>
        </motion.h1>

        <motion.p
          className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          The real-time test matrix that replaces messy spreadsheets. See what&rsquo;s
          tested, what&rsquo;s broken, and what&rsquo;s ready — all in one kanban board.
        </motion.p>

        {/* Quick wins */}
        <motion.div
          className="mt-6 flex items-center justify-center gap-4 flex-wrap"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2.5}
        >
          {quickWins.map((w) => (
            <span key={w} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 size={14} className="text-emerald-500" />
              {w}
            </span>
          ))}
        </motion.div>

        <motion.div
          className="mt-10 flex items-center justify-center gap-3 flex-wrap"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <Button size="lg" className="gap-2 text-sm h-12 px-6" render={<Link href="/sign-up" />}>
            Get started free <ArrowRight size={16} />
          </Button>
          <Button variant="outline" size="lg" className="text-sm h-12 px-6" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
        </motion.div>

        {/* Product preview */}
        <motion.div
          className="mt-20 mx-auto max-w-5xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={4}
        >
          <div className="relative rounded-2xl border border-border bg-card shadow-2xl shadow-black/5 dark:shadow-black/30 overflow-hidden">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-background border border-border text-[11px] text-muted-foreground font-mono">
                  app.retrack.dev/dashboard
                </div>
              </div>
            </div>
            <div className="aspect-[16/9] bg-muted/30 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Product screenshot</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
