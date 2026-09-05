import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `DELETE /v2/groups/{id}` — deletes a group.
 *
 * `delete_subscribers` is documented as a parameter with no stated location;
 * this sends it as a JSON body field, matching every other DELETE endpoint in
 * this API that accepts extra parameters (subscriber delete, remove-from-group).
 */
interface Input {
  id: string;
  deleteSubscribers?: boolean;
}

const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete the specified group.",
  idempotent: true,
  params: [
    { key: "id", label: "Group ID", type: "string", required: true },
    {
      key: "deleteSubscribers",
      label: "Also delete subscribers",
      type: "boolean",
      default: false,
      hint: "Soft-deletes the group's subscribers along with it. Off by default, matching the API.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/groups/${encodeURIComponent(input.id)}`, {
      method: "DELETE",
      body: compact({ delete_subscribers: input.deleteSubscribers }),
    });
  },
};

export default groupDelete;
