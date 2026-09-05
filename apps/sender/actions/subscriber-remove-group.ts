import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/** `DELETE /v2/subscribers/groups/{groupId}` — removes one or more subscribers from a group. */
interface Input {
  groupId: string;
  subscribers?: string[];
  conditions?: string;
}

const subscriberRemoveGroup: ActionDefinition<Input> = {
  key: "subscriber-remove-group",
  type: "perform",
  resource: "subscriber",
  title: "Remove Subscriber From Group",
  description: "Remove one or more subscribers from a group.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    {
      key: "subscribers",
      label: "Emails",
      type: "multiselect",
      hint: "Email addresses of the subscribers to remove from this group.",
    },
    {
      key: "conditions",
      label: "Conditions",
      type: "string",
      hint: "Selects all matching subscribers at once. Cannot be combined with Emails.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(
      `/subscribers/groups/${encodeURIComponent(input.groupId)}`,
      {
        method: "DELETE",
        body: compact({ subscribers: input.subscribers, conditions: input.conditions }),
      },
    );
  },
};

export default subscriberRemoveGroup;
