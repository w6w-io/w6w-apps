import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, jsonArray, unset } from "../lib/client.ts";
import { lineItemsParam, quoteOutput } from "../lib/params.ts";

interface Input {
  clientId: string;
  date?: string;
  dueDate?: string;
  publicNotes?: string;
  privateNotes?: string;
  lineItems?: unknown;
}

/**
 * `POST /api/v1/quotes` — verified against `QuoteRequest`, whose required
 * fields are `client_id`, `date` and `due_date` (unlike `InvoiceRequest`,
 * which requires only `client_id`).
 */
const quoteCreate: ActionDefinition<Input> = {
  key: "quote-create",
  type: "perform",
  resource: "quote",
  title: "Create Quote",
  description: "Create a quote for a client.",
  idempotent: false,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "date", label: "Quote date", type: "date", required: true, row: "dates" },
    { key: "dueDate", label: "Valid until", type: "date", required: true, row: "dates" },
    lineItemsParam,
    { key: "publicNotes", label: "Public notes", type: "text", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: quoteOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/quotes", {
      method: "POST",
      body: {
        client_id: input.clientId,
        date: input.date,
        due_date: input.dueDate,
        line_items: jsonArray(input.lineItems, "lineItems"),
        public_notes: unset(input.publicNotes),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default quoteCreate;
