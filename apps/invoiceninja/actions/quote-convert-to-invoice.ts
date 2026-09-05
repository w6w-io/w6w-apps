import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";

interface Input {
  quoteId: string;
}

/**
 * `POST /api/v1/quotes/bulk` with `action: "convert"` — verified against the
 * bulk-quote request schema's documented enum ("Bulk convert an array of
 * quotes to invoices"). Not marked idempotent — Invoice Ninja mints a new
 * invoice per conversion rather than reusing one from a prior call.
 */
const quoteConvertToInvoice: ActionDefinition<Input> = {
  key: "quote-convert-to-invoice",
  type: "perform",
  resource: "quote",
  title: "Convert Quote to Invoice",
  description: "Convert an approved quote into an invoice.",
  idempotent: false,
  params: [
    { key: "quoteId", label: "Quote ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new InvoiceNinjaClient(ctx).request("/quotes/bulk", {
      method: "POST",
      body: { action: "convert", ids: [input.quoteId] },
    });
    return {};
  },
};

export default quoteConvertToInvoice;
