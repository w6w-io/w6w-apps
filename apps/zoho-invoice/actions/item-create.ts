import type { ActionDefinition } from "@w6w/types";
import { invoiceCreate, type InvoiceCreateInput } from "../lib/invoice.ts";
import { dataFields, organizationId } from "../lib/params.ts";

const itemCreate: ActionDefinition<InvoiceCreateInput> = {
  key: "item-create",
  type: "perform",
  resource: "item",
  title: "Create Item",
  description: '`name` and `rate` are required, e.g. { "name": "Consulting", "rate": 150 }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "item_id", type: "string", label: "Item ID" }],

  execute(input, ctx) {
    return invoiceCreate(ctx, "/items", "item", input);
  },
};

export default itemCreate;
