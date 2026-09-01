import type { ActionDefinition } from "@w6w/types";
import { FreshBooksClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Get a single invoice by id.",
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
  ],
  output: [{ key: "invoice", type: "object", label: "Invoice" }],

  execute(input, ctx) {
    return new FreshBooksClient(ctx).request(
      "accounting",
      `/invoices/invoices/${encodeURIComponent(input.invoiceId)}`,
    );
  },
};

export default invoiceGet;
