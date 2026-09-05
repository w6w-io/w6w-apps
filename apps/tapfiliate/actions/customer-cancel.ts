import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";
import { customerIdParam } from "../lib/params.ts";

/** `DELETE /customers/{id}/status/` — sets the customer's status to `canceled`. */
interface Input {
  id: string;
}

const customerCancel: ActionDefinition<Input> = {
  key: "customer-cancel",
  type: "perform",
  resource: "customer",
  title: "Cancel Customer",
  description: "Mark a customer as canceled.",
  idempotent: true,
  params: [customerIdParam],
  output: [
    { key: "id", type: "string", label: "Customer id" },
    { key: "status", type: "string", label: 'Resulting status — "canceled"' },
  ],

  async execute(input, ctx) {
    return await new TapfiliateClient(ctx).json(`/customers/${encodeId(input.id)}/status/`, {
      method: "DELETE",
    });
  },
};

export default customerCancel;
