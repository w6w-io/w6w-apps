import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

/** `PUT /customers/{id}/status/` — the customer jumps back to its appropriate (non-canceled) status. */
interface Input {
  id: string;
}

const customerUncancel: ActionDefinition<Input> = {
  key: "customer-uncancel",
  type: "perform",
  resource: "customer",
  title: "Uncancel Customer",
  description: "Un-cancel a customer — it jumps back to the status it would otherwise be at.",
  idempotent: true,
  params: [customerIdParam],
  output: [
    { key: "id", type: "string", label: "Customer id" },
    { key: "status", type: "string", label: "Resulting status" },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/customers/${encodeId(input.id)}/status/`, {
      method: "PUT",
    });
  },
};

export default customerUncancel;
