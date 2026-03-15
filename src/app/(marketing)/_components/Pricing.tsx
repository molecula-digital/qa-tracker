"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For individuals and small projects.",
    features: [
      "1 project",
      "Up to 3 team members",
      "Basic test matrix",
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
      "Unlimited projects",
      "Up to 20 team members",
      "Real-time collaboration",
      "Release history & analytics",
      "Priority support",
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
      "Everything in Team",
      "Unlimited team members",
      "SSO & SAML",
      "Audit logs",
      "Custom integrations",
      "Dedicated support",
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
    <section id="pricing" className="py-32 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-neutral-900">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-neutral-500 max-w-2xl mx-auto">
            Start free and scale as your team grows. No surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`border rounded-2xl p-8 flex flex-col ${
                plan.highlighted
                  ? "border-neutral-900 ring-1 ring-neutral-900"
                  : "border-neutral-200"
              }`}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
            >
              <h3 className="text-lg font-bold text-neutral-900">{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
                <span className="text-neutral-500 text-sm">/{plan.period}</span>
              </div>
              <p className="mt-2 text-neutral-500 text-sm">{plan.description}</p>

              <ul className="mt-8 space-y-3 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm text-neutral-700">
                    <Check className="w-4 h-4 text-neutral-900 mt-0.5 shrink-0" strokeWidth={2} />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="/sign-up"
                className={`mt-8 block text-center text-sm font-medium px-6 py-3 rounded-full transition-colors ${
                  plan.highlighted
                    ? "bg-neutral-900 text-white hover:bg-neutral-800"
                    : "border border-neutral-300 text-neutral-900 hover:border-neutral-400"
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
