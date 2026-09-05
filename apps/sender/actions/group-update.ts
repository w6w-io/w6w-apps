import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/** `PATCH /v2/groups/{id}` — renames a group. */
interface Input {
  id: string;
  title?: string;
}

const groupUpdate: ActionDefinition<Input> = {
  key: "group-update",
  type: "perform",
  resource: "group",
  title: "Rename Group",
  description: "Change a group's name.",
  idempotent: true,
  params: [
    { key: "id", label: "Group ID", type: "string", required: true },
    { key: "title", label: "New title", type: "string" },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/groups/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      body: compact({ title: input.title }),
    });
  },
};

export default groupUpdate;
