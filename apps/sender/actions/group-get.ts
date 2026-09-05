import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `GET /v2/groups/{id}` — a single group's details. */
interface Input {
  id: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Get a group's details.",
  params: [{ key: "id", label: "Group ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/groups/${encodeURIComponent(input.id)}`);
  },
};

export default groupGet;
