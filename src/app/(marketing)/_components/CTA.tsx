"use client";

import { motion } from "framer-motion";

export function CTA() {
  return (
    <section className="bg-neutral-900 py-32 px-6">
      <motion.div
        className="mx-auto max-w-3xl text-center"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0, 0, 0.2, 1] }}
      >
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white leading-tight">
          Ready to ship with confidence?
        </h2>
        <p className="mt-6 text-lg text-neutral-400 max-w-xl mx-auto">
          Join teams that replaced spreadsheet chaos with a clear, real-time
          view of what&rsquo;s tested and what&rsquo;s ready.
        </p>
        <div className="mt-10">
          <a
            href="/sign-up"
            className="inline-block bg-white text-neutral-900 px-8 py-3 rounded-full text-sm font-medium hover:bg-neutral-100 transition-colors"
          >
            Get started free
          </a>
        </div>
      </motion.div>
    </section>
  );
}
