import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient, jsonArray, unset } from "../lib/client.ts";
import { quoteOutput } from "../lib/params.ts";

interface Input {
  quoteId: string;
  dueDate?: string;
  publicNotes?: string;
  privateNotes?: string;
  lineItems?: unknown;
}

/** `PUT /api/v1/quotes/{id}` — verified against `updateQuote` and `QuoteRequest`. */
const quoteUpdate: ActionDefinition<Input> = {
  key: "quote-update",
  type: "perform",
  resource: "quote",
  title: "Update Quote",
  description: "Update a quote. Only the fields you set are changed.",
  idempotent: true,
  params: [
    { key: "quoteId", label: "Quote ID", type: "string", required: true },
    { key: "dueDate", label: "Valid until", type: "date" },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      advanced: true,
      hint: "Replaces the entire line-item array when set. Leave unset to keep the existing lines.",
    },
    { key: "publicNotes", label: "Public notes", type: "text", advanced: true },
    { key: "privateNotes", label: "Private notes", type: "text", advanced: true },
  ],
  output: quoteOutput,

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request(`/quotes/${input.quoteId}`, {
      method: "PUT",
      body: {
        due_date: unset(input.dueDate),
        line_items: input.lineItems !== undefined
          ? jsonArray(input.lineItems, "lineItems")
          : undefined,
        public_notes: unset(input.publicNotes),
        private_notes: unset(input.privateNotes),
      },
    });
  },
};

export default quoteUpdate;
