import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";

interface Input {
  invoiceKey: string;
}

/**
 * `GET /v1/invoices/{invoiceKey}` — verified against
 * `developer.zuora.com/v1-api-reference/api/invoices/get_getinvoice`.
 * `invoiceKey` accepts either the invoice's Id or its Invoice Number.
 */
const action: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve a specific invoice.",
  params: [
    {
      key: "invoiceKey",
      label: "Invoice Key",
      type: "string",
      required: true,
      hint: "The invoice's Id or Invoice Number.",
    },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const invoice = await client.request(`/v1/invoices/${encodeURIComponent(input.invoiceKey)}`);
    return { invoice };
  },
};

export default action;
