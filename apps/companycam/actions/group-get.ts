import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/groups/{id}` — one group and its members.
 */
interface Input {
  groupId: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Retrieve Group",
  description: "Fetch one group by id, with its members.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "users", type: "array", label: "Members" },
    { key: "status", type: "string", label: "Status" },
    { key: "group_url", type: "string", label: "Group URL" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/groups/${encodeId(input.groupId)}`);
  },
};

export default groupGet;
