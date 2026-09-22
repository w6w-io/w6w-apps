import type { ActionDefinition } from "@w6w/types";
import { inventoryCreate, type InventoryCreateInput } from "../lib/inventory.ts";
import { dataFields, organizationId } from "../lib/params.ts";

/**
 * Zoho Inventory's Contact attribute table makes `contact_name` the only
 * required field; `company_name`, `contact_type` ("customer" | "vendor") and
 * `website` are the documented optional ones this app's description names.
 */
const contactCreate: ActionDefinition<InventoryCreateInput> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a customer or vendor. `contact_name` is required; `company_name`, `contact_type` " +
    '("customer" | "vendor") and `website` are optional, e.g. { "contact_name": "Acme Inc", ' +
    '"contact_type": "customer", "website": "https://acme.example" }.',
  idempotent: false,
  params: [dataFields, organizationId],
  output: [{ key: "contact_id", type: "string", label: "Contact ID" }],

  execute(input, ctx) {
    return inventoryCreate(ctx, "/contacts", "contact", input);
  },
};

export default contactCreate;
