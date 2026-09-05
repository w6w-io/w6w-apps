import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { quoteOutput } from "../lib/params.ts";

interface Input {
  quoteId: string;
}

/** `GET /api/v1/quotes/{id}` — verified against `showQuote`. */
const quoteGet: ActionDefinition<Input> = {
  key: "quote-get",
  type: "read",
  resource: "quote",
  title: "Get Quote",
  description: "Retrieve a single quote by hashed ID.",
  params: [
    { key: "quoteId", label: "Quote ID", type: "string", required: true },
  ],
  output: quoteOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/quotes/${input.quoteId}`);
  },
};

export default quoteGet;
