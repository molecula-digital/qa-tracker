"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const subscription: any = null;

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
        const result = await subscription?.list();
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
      await subscription?.upgrade({ plan: planId });
    } catch {
      // handle silently
    } finally {
      setUpgradeLoading(null);
    }
  }

  async function handleManage() {
    try {
      const result = await subscription?.billingPortal({
        returnUrl: "/dashboard/billing",
      });
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
        <h1 className="text-2xl font-semibold text-foreground mb-8">
          Billing
        </h1>
        <p className="text-sm text-muted-foreground">Loading plans...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-semibold text-foreground mb-2">Billing</h1>
      <p className="text-muted-foreground mb-8">
        Manage your subscription and billing details.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.planId;

          return (
            <Card
              key={plan.planId}
              className={`flex flex-col ${
                isCurrent ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-semibold text-foreground">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="flex-1 pt-6">
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                {isCurrent ? (
                  <>
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                    {plan.planId !== "free" && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={handleManage}
                      >
                        Manage subscription
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.planId)}
                    disabled={upgradeLoading === plan.planId}
                  >
                    {upgradeLoading === plan.planId
                      ? "Processing..."
                      : `Upgrade to ${plan.name}`}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
