"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
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
    <section id="pricing" className="py-24 md:py-32 px-6">
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
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              custom={i}
            >
              <Card
                className={`flex flex-col h-full ${
                  plan.highlighted
                    ? "border-neutral-900 ring-1 ring-neutral-900"
                    : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.highlighted && (
                      <Badge variant="secondary">Popular</Badge>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
                    <span className="text-neutral-500 text-sm">/{plan.period}</span>
                  </div>
                  <p className="mt-2 text-neutral-500 text-sm">{plan.description}</p>
                </CardHeader>

                <Separator />

                <CardContent className="flex-1 pt-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-neutral-700">
                        <Check className="w-4 h-4 text-neutral-900 mt-0.5 shrink-0" strokeWidth={2} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    render={<Link href="/sign-up" />}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
