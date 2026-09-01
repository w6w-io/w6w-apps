import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, jsonObject } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  fields: unknown;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Update fields on an existing invoice.",
  // A PUT is a full replace of the fields it names; sending the same body
  // twice leaves the invoice in the same state, so retrying is safe.
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        'JSON object using FreeAgent\'s field names, e.g. { "reference": "003b", "comments": "Revised total" }.',
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/invoices/${input.invoiceId}`, {
      method: "PUT",
      body: { invoice: jsonObject(input.fields, "fields") },
    });
  },
};

export default invoiceUpdate;
