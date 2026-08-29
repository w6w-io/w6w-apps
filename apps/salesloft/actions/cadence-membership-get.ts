import type { ActionDefinition } from "@w6w/types";
import { SalesloftClient } from "../lib/client.ts";

interface Input {
  id: number;
}

/** GET /v2/cadence_memberships/:id — fetch a single cadence membership by id. */
const cadenceMembershipGet: ActionDefinition<Input> = {
  key: "cadence-membership-get",
  type: "read",
  resource: "cadence-membership",
  title: "Get Cadence Membership",
  description: "Fetch a cadence membership by ID.",
  params: [
    { key: "id", label: "Cadence Membership ID", type: "number", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Cadence membership" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request(`/cadence_memberships/${input.id}`);
  },
};

export default cadenceMembershipGet;
