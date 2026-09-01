import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient, jsonObject } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  fields: unknown;
}

const invoiceUpdate: ActionDefinition<Input> = {
  key: "invoice-update",
  type: "perform",
  resource: "invoice",
  title: "Update Invoice",
  description: "Update an existing invoice's fields.",
  // PUTting the same field set twice converges on the same record.
  idempotent: true,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of FreshBooks invoice field names -> values, e.g. { "notes": "Thanks!" }.',
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/invoices/invoices/${encodeURIComponent(input.invoiceId)}`,
      { method: "PUT", body: { invoice: jsonObject(input.fields, "fields") } },
    );
  },
};

export default invoiceUpdate;
