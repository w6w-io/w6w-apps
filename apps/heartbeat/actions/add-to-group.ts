import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `PUT /v0/groups/{groupID}/memberships` — add members to a group by email. */
interface Input {
  groupID: string;
  emails: string[] | string;
  shouldRemoveFromSiblingGroups?: boolean;
}

const addToGroup: ActionDefinition<Input> = {
  key: "add-to-group",
  type: "perform",
  resource: "group",
  title: "Add Users to Group",
  description: "Add members to a group by email.",
  idempotent: true,
  params: [
    { key: "groupID", label: "Group ID", type: "string", required: true },
    { key: "emails", label: "Emails", type: "multiselect", required: true },
    {
      key: "shouldRemoveFromSiblingGroups",
      label: "Remove from sibling groups",
      type: "boolean",
      hint: "Removes these members from any other group sharing this one's parent — useful for " +
        "moving members between stages.",
    },
  ],
  output: [],

  execute(input, ctx) {
    const emails = Array.isArray(input.emails)
      ? input.emails
      : input.emails.split(",").map((s) => s.trim()).filter(Boolean);
    return new HeartbeatClient(ctx).json(
      `/groups/${encodeURIComponent(input.groupID)}/memberships`,
      {
        method: "PUT",
        body: {
          emails,
          ...(input.shouldRemoveFromSiblingGroups !== undefined
            ? { shouldRemoveFromSiblingGroups: input.shouldRemoveFromSiblingGroups }
            : {}),
        },
      },
    );
  },
};

export default addToGroup;
