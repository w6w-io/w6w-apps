import type { ActionDefinition } from "@w6w/types";
import { FreshsalesClient } from "../lib/client.ts";

interface Input {
  dealId: number;
}

const dealDelete: ActionDefinition<Input> = {
  key: "deal-delete",
  type: "perform",
  resource: "deal",
  title: "Delete Deal",
  description: "Permanently delete a deal.",
  idempotent: true,
  params: [
    { key: "dealId", label: "Deal ID", type: "number", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    // The docs only show the response body for "Delete a Contact" (the bare
    // JSON literal `true`); this app treats deals and accounts as following
    // the same REST convention rather than a separately verified response.
    const result = await new FreshsalesClient(ctx).request<boolean>(`/deals/${input.dealId}`, {
      method: "DELETE",
    });
    return { deleted: result === true };
  },
};

export default dealDelete;
