import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { organization } from "better-auth/plugins/organization";
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";
import { db } from "@/server/db";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      subscription: {
        enabled: true,
        plans: [
          {
            name: "team",
            priceId: process.env.STRIPE_PRICE_ID_TEAM!,
            limits: {
              members: 3,
              projects: 10,
            },
          },
          {
            name: "business",
            priceId: process.env.STRIPE_PRICE_ID_BUSINESS!,
            limits: {
              members: 15,
              projects: 999999,
            },
          },
        ],
      },
      organization: {
        enabled: true,
      },
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
