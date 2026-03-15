"use client";

import { useState, useEffect } from "react";
import { subscription } from "@/lib/auth-client";

interface Plan {
  name: string;
  price: string;
  period: string;
  features: string[];
  planId: string;
}

const plans: Plan[] = [
  {
    name: "Free",
    price: "$0",
    period: "",
    planId: "free",
    features: [
      "Up to 3 projects",
      "Basic release tracking",
      "1 team member",
      "Community support",
    ],
  },
  {
    name: "Team",
    price: "$19",
    period: "/mo",
    planId: "team",
    features: [
      "Unlimited projects",
      "Advanced release tracking",
      "Up to 10 team members",
      "Priority support",
      "Custom notifications",
    ],
  },
  {
    name: "Business",
    price: "$49",
    period: "/mo",
    planId: "business",
    features: [
      "Everything in Team",
      "Unlimited team members",
      "SSO / SAML",
      "Audit logs",
      "Dedicated support",
      "Custom integrations",
    ],
  },
];

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const result = await subscription.list();
        if (result.data && result.data.length > 0) {
          setCurrentPlan(result.data[0].plan ?? "free");
        } else {
          setCurrentPlan("free");
        }
      } catch {
        setCurrentPlan("free");
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, []);

  async function handleUpgrade(planId: string) {
    setUpgradeLoading(planId);
    try {
      await subscription.upgrade({ plan: planId });
    } catch {
      // handle silently
    } finally {
      setUpgradeLoading(null);
    }
  }

  async function handleManage() {
    try {
      const result = await subscription.cancel();
      if (result.data && typeof result.data === "object" && "url" in result.data) {
        window.location.href = result.data.url as string;
      }
    } catch {
      // handle silently
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <h1 className="text-2xl font-semibold text-neutral-900 mb-8">
          Billing
        </h1>
        <p className="text-sm text-neutral-500">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Billing</h1>
      <p className="text-neutral-500 mb-8">
        Manage your subscription and billing details.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.planId;

          return (
            <div
              key={plan.planId}
              className={`rounded-md border p-6 ${
                isCurrent
                  ? "border-neutral-900"
                  : "border-neutral-200"
              }`}
            >
              <h2 className="text-lg font-semibold text-neutral-900">
                {plan.name}
              </h2>
              <div className="mt-2 mb-4">
                <span className="text-3xl font-semibold text-neutral-900">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-neutral-500">{plan.period}</span>
                )}
              </div>

              <ul className="mb-6 space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-neutral-600"
                  >
                    <span className="mt-0.5 text-neutral-400">--</span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div>
                  <span className="block w-full rounded-md border border-neutral-300 px-4 py-2 text-center text-sm font-medium text-neutral-500">
                    Current plan
                  </span>
                  {plan.planId !== "free" && (
                    <button
                      onClick={handleManage}
                      className="mt-2 block w-full text-center text-sm text-neutral-500 hover:text-neutral-900 underline"
                    >
                      Manage subscription
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.planId)}
                  disabled={upgradeLoading === plan.planId}
                  className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {upgradeLoading === plan.planId
                    ? "Processing..."
                    : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
