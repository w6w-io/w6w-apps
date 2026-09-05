import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `DELETE /v0/groups/{groupID}/memberships` — remove members from a group by email. */
interface Input {
  groupID: string;
  emails: string[] | string;
}

const removeFromGroup: ActionDefinition<Input> = {
  key: "remove-from-group",
  type: "perform",
  resource: "group",
  title: "Remove Users from Group",
  description: "Remove members from a group by email.",
  idempotent: true,
  params: [
    { key: "groupID", label: "Group ID", type: "string", required: true },
    { key: "emails", label: "Emails", type: "multiselect", required: true },
  ],
  output: [],

  execute(input, ctx) {
    const emails = Array.isArray(input.emails)
      ? input.emails
      : input.emails.split(",").map((s) => s.trim()).filter(Boolean);
    return new HeartbeatClient(ctx).json(
      `/groups/${encodeURIComponent(input.groupID)}/memberships`,
      {
        method: "DELETE",
        body: { emails },
      },
    );
  },
};

export default removeFromGroup;
