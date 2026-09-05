import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  quoteId: string;
}

/** `DELETE /api/v1/quotes/{id}` — verified against `deleteQuote`. Soft delete. */
const quoteDelete: ActionDefinition<Input> = {
  key: "quote-delete",
  type: "perform",
  resource: "quote",
  title: "Delete Quote",
  description: "Soft-delete a quote.",
  idempotent: true,
  params: [
    { key: "quoteId", label: "Quote ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request(`/quotes/${input.quoteId}`, { method: "DELETE" });
    return {};
  },
};

export default quoteDelete;
