import type { ActionDefinition } from "@w6w/types";
import { SystemeClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const membershipDelete: ActionDefinition<Input> = {
  key: "membership-delete",
  type: "perform",
  resource: "membership",
  title: "Remove Contact from Community",
  description: "Remove a Membership resource.",
  idempotent: true,
  params: [
    { key: "id", label: "Membership ID", type: "string", required: true },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new SystemeClient(ctx).status(
      `/api/community/memberships/${encodeURIComponent(input.id)}`,
    );
    return { status };
  },
};

export default membershipDelete;
