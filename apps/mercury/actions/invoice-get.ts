import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { invoiceIdParam } from "../lib/params.ts";

/** `GET /ar/invoices/{invoiceId}` — a single AR invoice by ID. */
interface Input {
  invoiceId: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve a single accounts-receivable invoice by ID.",
  params: [invoiceIdParam],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  async execute(input, ctx) {
    const invoice = await new MercuryClient(ctx).json(
      `/ar/invoices/${encodeURIComponent(input.invoiceId)}`,
    );
    return { invoice };
  },
};

export default invoiceGet;
