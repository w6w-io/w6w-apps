import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";

/**
 * `POST /v1/plans` — a recurring billing plan, reusable across many
 * subscriptions. Once created, a plan's details cannot be modified — a
 * pricing change means creating a new plan.
 */
interface Input {
  period: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  interval: number;
  itemName: string;
  itemDescription?: string;
  amount: number;
  currency?: string;
}

const planCreate: ActionDefinition<Input> = {
  key: "plan-create",
  type: "perform",
  resource: "plan",
  title: "Create Plan",
  description:
    "Define a recurring billing plan (period, interval, amount). Cannot be modified once created.",
  idempotent: false,
  params: [
    {
      key: "period",
      label: "Billing period",
      type: "select",
      required: true,
      options: [
        { value: "daily", label: "Daily (interval must be >= 7)" },
        { value: "weekly", label: "Weekly" },
        { value: "monthly", label: "Monthly" },
        { value: "quarterly", label: "Quarterly" },
        { value: "yearly", label: "Yearly" },
      ],
    },
    {
      key: "interval",
      label: "Interval",
      type: "number",
      required: true,
      default: 1,
      validation: { integer: true, min: 1 },
      hint:
        "Number of periods between charges — interval=3, period=monthly charges every 3 months.",
    },
    { key: "itemName", label: "Plan name", type: "string", required: true },
    { key: "itemDescription", label: "Plan description", type: "text" },
    {
      key: "amount",
      label: "Amount per billing cycle",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "Smallest currency sub-unit — paise for INR.",
    },
    { key: "currency", label: "Currency", type: "string", default: "INR" },
  ],
  output: [
    { key: "id", type: "string", label: "Plan ID (plan_*)" },
    { key: "period", type: "string", label: "Billing period" },
    { key: "interval", type: "number", label: "Interval" },
    { key: "item", type: "object", label: "Priced item" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post("/plans", {
      period: input.period,
      interval: input.interval,
      item: {
        name: input.itemName,
        description: input.itemDescription,
        amount: input.amount,
        currency: input.currency ?? "INR",
      },
    });
  },
};

export default planCreate;
