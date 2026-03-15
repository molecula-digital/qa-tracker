"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

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
    <section className="py-32 md:py-40 px-6">
      <div className="mx-auto max-w-6xl text-center">
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
          <Button size="lg" render={<Link href="/sign-up" />}>
            Get started free
          </Button>
          <Button variant="outline" size="lg" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
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
