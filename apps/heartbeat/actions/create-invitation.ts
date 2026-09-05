import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";

/**
 * `PUT /v0/invitations` — create a new invitation link.
 *
 * Each call mints a distinct link (its own `code`), so retrying after a
 * dropped response creates a second, separate invitation rather than
 * returning the first.
 */
interface Input {
  roleID: string;
  groupIDs: string[] | string;
}

const createInvitation: ActionDefinition<Input> = {
  key: "create-invitation",
  type: "perform",
  resource: "invitation",
  title: "Create Invitation Link",
  description:
    "Create a new invitation link. Members joining via it get this role and these groups.",
  idempotent: false,
  params: [
    { key: "roleID", label: "Role ID", type: "string", required: true },
    { key: "groupIDs", label: "Group IDs", type: "multiselect", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Invitation ID" },
    { key: "code", type: "string", label: "6-digit alphanumeric invitation code" },
    { key: "role", type: "object", label: "Role — {id, name}" },
    { key: "groups", type: "array", label: "Groups — [{id, name}]" },
  ],

  execute(input, ctx) {
    const groupIDs = Array.isArray(input.groupIDs)
      ? input.groupIDs
      : input.groupIDs.split(",").map((s) => s.trim()).filter(Boolean);
    return new HeartbeatClient(ctx).json("/invitations", {
      method: "PUT",
      body: compact({ roleID: input.roleID, groupIDs }),
    });
  },
};

export default createInvitation;
