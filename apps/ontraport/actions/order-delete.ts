import type { ActionDefinition } from "@w6w/types";
import { OntraportClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /1/Order` — permanently delete a single order by ID.
 *
 * The Accessible Objects table grants Order (52) GET and DELETE, but not PUT
 * or POST — there is no "create order" or "update order" action here.
 */
interface Input {
  id: string;
}

const orderDelete: ActionDefinition<Input> = {
  key: "order-delete",
  type: "perform",
  resource: "order",
  title: "Delete Order",
  description: "Permanently delete a single order by ID.",
  idempotent: true,
  params: [idParam],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new OntraportClient(ctx).envelope("/Order", {
      method: "DELETE",
      query: { id: input.id },
    });
    return { deleted: true };
  },
};

export default orderDelete;
