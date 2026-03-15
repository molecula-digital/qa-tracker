"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTA() {
  return (
    <section className="border-t border-border bg-muted/30 py-24 md:py-32 px-6">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
      >
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
          Ready to ship with confidence?
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
          Join teams that replaced spreadsheet chaos with a clear, real-time
          view of what&rsquo;s tested and what&rsquo;s ready.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Button size="lg" className="gap-2 h-12 px-6" render={<Link href="/sign-up" />}>
            Get started free <ArrowRight size={16} />
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
