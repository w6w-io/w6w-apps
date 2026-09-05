import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/invitations` — every invitation link in the community. */
const listInvitations: ActionDefinition<Record<string, never>> = {
  key: "list-invitations",
  type: "read",
  resource: "invitation",
  title: "List Invitations",
  description: "Return every invitation link in the community.",
  params: [],
  output: [{
    key: "invitations",
    type: "array",
    label: "Invitations — [{id, code, role, groups}]",
  }],

  async execute(_input, ctx) {
    const invitations = await new HeartbeatClient(ctx).json("/invitations");
    return { invitations };
  },
};

export default listInvitations;
