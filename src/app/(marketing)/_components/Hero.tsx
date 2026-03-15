"use client";

import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0, 0, 0.2, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="pt-40 pb-32 px-6">
      <div className="mx-auto max-w-4xl text-center">
        <motion.h1
          className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 leading-[1.08]"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
        >
          Track every test.
          <br />
          Ship with confidence.
        </motion.h1>

        <motion.p
          className="mt-6 text-lg md:text-xl text-neutral-500 max-w-2xl mx-auto leading-relaxed"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
        >
          The real-time test matrix for QA teams that need clarity before every
          release. Know what&rsquo;s tested, what&rsquo;s broken, and
          what&rsquo;s ready to ship.
        </motion.p>

        <motion.div
          className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
        >
          <a
            href="/sign-up"
            className="bg-neutral-900 text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-neutral-800 transition-colors"
          >
            Get started free
          </a>
          <a
            href="/sign-in"
            className="border border-neutral-300 text-neutral-900 px-8 py-3 rounded-full text-sm font-medium hover:border-neutral-400 transition-colors"
          >
            Sign in
          </a>
        </motion.div>

        <motion.div
          className="mt-20 mx-auto max-w-5xl"
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
        >
          <div className="border border-neutral-200 rounded-2xl shadow-2xl bg-neutral-50 aspect-video flex items-center justify-center">
            <span className="text-neutral-400 text-sm">Product screenshot</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
