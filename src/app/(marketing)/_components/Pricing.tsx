"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals and small projects.",
    features: [
      "1 team member",
      "2 projects",
      "5 sections per project",
      "Community support",
    ],
    cta: "Get started free",
    highlighted: false,
  },
  {
    name: "Team",
    price: "$19",
    period: "per month",
    description: "For growing QA teams that ship often.",
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
    period: "per month",
    description: "For organizations with advanced needs.",
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

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0, 0, 0.2, 1] as const },
  }),
};

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free and scale as your team grows. No surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
              className={`flex flex-col rounded-2xl border bg-card p-1 ${
                plan.highlighted
                  ? "border-foreground ring-1 ring-foreground"
                  : "border-border"
              }`}
            >
              <div className="flex-1 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base font-bold text-foreground">{plan.name}</span>
                  {plan.highlighted && (
                    <Badge className="text-[10px]">Popular</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-foreground tracking-tight">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">{plan.description}</p>

                <Separator className="mb-6" />

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-foreground">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" strokeWidth={2.5} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 pt-0">
                <Button
                  variant={plan.highlighted ? "default" : "outline"}
                  className="w-full"
                  render={<Link href="/sign-up" />}
                >
                  {plan.cta}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
