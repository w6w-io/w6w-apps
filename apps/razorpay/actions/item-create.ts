import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { amountParam, currencyParam } from "../lib/params.ts";

/**
 * `POST /v1/items` — a reusable catalog item, referenceable from an invoice
 * line item by `item_id` to auto-fill its price and description.
 */
interface Input {
  name: string;
  description?: string;
  amount: number;
  currency?: string;
}

const itemCreate: ActionDefinition<Input> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description: "Create a reusable catalog item for use in invoice line items.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    amountParam("Price"),
    currencyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Item ID (item_*)" },
    { key: "name", type: "string", label: "Name" },
    { key: "amount", type: "number", label: "Price (sub-unit)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "active", type: "boolean", label: "Available for new invoices" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post("/items", {
      name: input.name,
      description: input.description,
      amount: input.amount,
      currency: input.currency ?? "INR",
    });
  },
};

export default itemCreate;
