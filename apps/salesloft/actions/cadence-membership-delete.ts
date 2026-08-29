import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** DELETE /v2/cadence_memberships/:id — remove a person from a cadence. */
const cadenceMembershipDelete: ActionDefinition<Input> = {
  key: "cadence-membership-delete",
  type: "perform",
  resource: "cadence-membership",
  title: "Remove Person from Cadence",
  description: "Delete a cadence membership, removing the person from that cadence.",
  idempotent: true,
  params: [
    { key: "id", label: "Cadence Membership ID", type: "number", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    await client.request(`/cadence_memberships/${input.id}`, { method: "DELETE" });
    return { success: true };
  },
};

export default cadenceMembershipDelete;
