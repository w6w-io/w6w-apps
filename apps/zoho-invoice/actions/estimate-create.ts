import type { ActionDefinition } from "@w6w/types";
import { invoiceCreate, type InvoiceCreateInput } from "../lib/invoice.ts";
import { dataFields, organizationId } from "../lib/params.ts";

const estimateCreate: ActionDefinition<InvoiceCreateInput> = {
  key: "estimate-create",
  type: "perform",
  resource: "estimate",
  title: "Create Estimate",
  description:
    '`customer_id` is required, e.g. { "customer_id": "460000000123456", "line_items": ' +
    '[{ "item_id": "460000000234567", "quantity": 1 }] }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "estimate_id", type: "string", label: "Estimate ID" }],

  execute(input, ctx) {
    return invoiceCreate(ctx, "/estimates", "estimate", input);
  },
};

export default estimateCreate;
