"use client";

import { motion } from "framer-motion";
import { Kanban, Zap, Users, Shield } from "lucide-react";

const features = [
  {
    icon: Kanban,
    title: "Kanban test matrix",
    description:
      "Visualize your entire test suite in a clean, drag-and-drop matrix. See status at a glance across builds, platforms, and environments.",
  },
  {
    icon: Zap,
    title: "Real-time collaboration",
    description:
      "Every update syncs instantly. Your team always sees the latest results — no more stale spreadsheets or Slack threads.",
  },
  {
    icon: Users,
    title: "Built for teams",
    description:
      "Assign tests, track ownership, and coordinate across QA, dev, and product. Everyone stays on the same page.",
  },
  {
    icon: Shield,
    title: "Release with confidence",
    description:
      "Get a clear go/no-go signal before every release. Know exactly what passed, what failed, and what still needs attention.",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

export function Features() {
  return (
    <section id="features" className="bg-muted/50 py-24 md:py-32 px-6 border-y border-border">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Everything your QA team needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A focused toolkit that replaces messy spreadsheets and scattered
            threads with one clear source of truth.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              className="group rounded-2xl border border-border bg-card p-8 hover:border-foreground/20 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-muted border border-border mb-5 group-hover:border-foreground/20 transition-colors">
                <feature.icon className="w-5 h-5 text-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-bold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
