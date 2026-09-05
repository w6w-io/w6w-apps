import type { ActionDefinition } from "@w6w/types";
import { InvoiceNinjaClient } from "../lib/client.ts";
import { pagination, statusFilter } from "../lib/params.ts";

interface Input {
  clientId?: string;
  status?: string[];
  page?: number;
  perPage?: number;
}

/** `GET /api/v1/payments` — verified against `getPayments`. */
const paymentGetMany: ActionDefinition<Input> = {
  key: "payment-get-many",
  type: "search",
  resource: "payment",
  title: "List Payments",
  description: "List payments, optionally scoped to one client.",
  params: [
    { key: "clientId", label: "Client ID", type: "string" },
    statusFilter,
    ...pagination,
  ],
  output: [{ key: "data", type: "array", label: "Payments" }],

  execute(input, ctx) {
    return new InvoiceNinjaClient(ctx).request("/payments", {
      query: {
        client_id: input.clientId,
        status: input.status?.length ? input.status.join(",") : undefined,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default paymentGetMany;
