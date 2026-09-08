import type { ActionDefinition } from "@w6w/types";
import { BooqableClient } from "../lib/client.ts";

interface Input {
  customerId: string;
}

/**
 * `DELETE /customers/{id}` — verified against developers.booqable.com ("Archive
 * a customer"). Despite the HTTP verb, this is a soft archive, not a hard
 * delete: the documented 200 response returns the full customer resource with
 * `archived: true` / `archived_at` set, not a 204. Modeled as `perform`
 * rather than a destructive delete for that reason.
 */
const customerArchive: ActionDefinition<Input> = {
  key: "customer-archive",
  type: "perform",
  resource: "customer",
  title: "Archive Customer",
  description: "Archive a customer. Booqable keeps the record; it stops appearing by default.",
  // Archiving an already-archived customer returns the same 200 body rather
  // than erroring, so retrying converges on the same end state.
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "The archived Customer object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/customers/${input.customerId}`, {
      method: "DELETE",
    });
  },
};

export default customerArchive;
