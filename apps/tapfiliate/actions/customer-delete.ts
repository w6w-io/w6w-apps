import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

/**
 * `DELETE /customers/{id}/`
 *
 * The docs label this `Response: 204`, but the shown example response body is
 * a one-item array of the deleted customer. Since this could not be verified
 * live (no valid credential), the client's `json()` handles either shape —
 * a genuine 204 returns `undefined`.
 */
interface Input {
  id: string;
}

const customerDelete: ActionDefinition<Input> = {
  key: "customer-delete",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description: "Permanently delete a customer.",
  idempotent: true,
  params: [customerIdParam],
  output: [{
    key: "result",
    type: "object",
    label: "Deleted customer, if the vendor returns a body",
  }],

  async execute(input, ctx) {
    const result = await new TapfiliateClient(ctx).json(`/customers/${encodeId(input.id)}/`, {
      method: "DELETE",
    });
    return { result: result ?? null };
  },
};

export default customerDelete;
