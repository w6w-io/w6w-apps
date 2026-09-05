import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  quoteId: string;
}

/**
 * `POST /api/v1/quotes/bulk` with `action: "approve"` — verified against the
 * bulk-quote request schema's documented enum ("Bulk approve an array of
 * quotes"). One-element `ids` array to approve a single quote.
 */
const quoteApprove: ActionDefinition<Input> = {
  key: "quote-approve",
  type: "perform",
  resource: "quote",
  title: "Approve Quote",
  description: "Approve a quote on the client's behalf.",
  // Approving an already-approved quote is a no-op on Invoice Ninja's side.
  idempotent: true,
  params: [
    { key: "quoteId", label: "Quote ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request("/quotes/bulk", {
      method: "POST",
      body: { action: "approve", ids: [input.quoteId] },
    });
    return {};
  },
};

export default quoteApprove;
