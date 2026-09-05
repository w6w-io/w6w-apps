import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/** `POST /v2/subscribers/groups/{groupId}` — adds one or more subscribers to a group. */
interface Input {
  groupId: string;
  subscribers?: string[];
  conditions?: string;
  triggerAutomation?: boolean;
}

const subscriberAddGroup: ActionDefinition<Input> = {
  key: "subscriber-add-group",
  type: "perform",
  resource: "subscriber",
  title: "Add Subscriber To Group",
  description: "Add one or more subscribers to the specified group.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    {
      key: "subscribers",
      label: "Emails",
      type: "multiselect",
      hint: "Email addresses of the subscribers to add to this group.",
    },
    {
      key: "conditions",
      label: "Conditions",
      type: "string",
      hint: "Selects all matching subscribers at once. Cannot be combined with Emails.",
    },
    {
      key: "triggerAutomation",
      label: "Trigger automation",
      type: "boolean",
      default: true,
      hint: "Sender's own default is true. Set to false to skip activating an automation.",
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
        method: "POST",
        body: compact({
          subscribers: input.subscribers,
          conditions: input.conditions,
          trigger_automation: input.triggerAutomation,
        }),
      },
    );
  },
};

export default subscriberAddGroup;
