import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `POST /v2/groups` — creates a new group. */
interface Input {
  title: string;
}

const groupCreate: ActionDefinition<Input> = {
  key: "group-create",
  type: "perform",
  resource: "group",
  title: "Create Group",
  description: "Create a new subscriber group.",
  idempotent: false,
  params: [{ key: "title", label: "Title", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data("/groups", { method: "POST", body: { title: input.title } });
  },
};

export default groupCreate;
