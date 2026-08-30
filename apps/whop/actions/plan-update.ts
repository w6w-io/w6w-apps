import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { currencyParam, planIdParam } from "../lib/params.ts";

interface Input {
  planId: string;
  title?: string;
  renewalPrice?: number;
  currency?: string;
  visibility?: string;
  stock?: number;
  unlimitedStock?: boolean;
}

const planUpdate: ActionDefinition<Input> = {
  key: "plan-update",
  type: "perform",
  resource: "plan",
  title: "Update Plan",
  description: "Update a plan's pricing, visibility, or stock.",
  idempotent: true,
  params: [
    planIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "renewalPrice", label: "Renewal price", type: "number" },
    currencyParam,
    {
      key: "visibility",
      label: "Visibility",
      type: "select",
      options: [
        { value: "visible", label: "Visible" },
        { value: "hidden", label: "Hidden" },
        { value: "archived", label: "Archived" },
      ],
    },
    {
      key: "stock",
      label: "Stock",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Maximum units available for purchase. Ignored when unlimited stock is on.",
    },
    { key: "unlimitedStock", label: "Unlimited stock", type: "boolean" },
  ],
  output: [{ key: "data", type: "object", label: "The updated plan" }],

  execute(input, ctx) {
    return new WhopClient(ctx).patch(`/plans/${encodeURIComponent(input.planId)}`, {
      title: input.title,
      renewal_price: input.renewalPrice,
      currency: input.currency,
      visibility: input.visibility,
      stock: input.stock,
      unlimited_stock: input.unlimitedStock,
    });
  },
};

export default planUpdate;
