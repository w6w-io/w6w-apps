import type { ActionDefinition } from "@w6w/types";
import { INVOICE_FIELDS, unwrapBusiness, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  invoiceId: string;
}

const QUERY = `
  query GetInvoice($businessId: ID!, $invoiceId: ID!) {
    business(id: $businessId) {
      id
      invoice(id: $invoiceId) {
        ${INVOICE_FIELDS}
      }
    }
  }
`;

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description: "Retrieve a single invoice by id.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
  ],
  output: [{ key: "invoice", type: "object", label: "The invoice" }],

  async execute(input, ctx) {
    const data = await new WaveClient(ctx).query<Record<string, unknown>>(QUERY, {
      businessId: input.businessId,
      invoiceId: input.invoiceId,
    });
    return unwrapBusiness(data, "invoice");
  },
};

export default invoiceGet;
