import type { ActionDefinition } from "@w6w/types";
import { SenderClient, type SenderListPage } from "../lib/client.ts";

/** `GET /v2/groups/{id}/subscribers` — every subscriber in a group. */
interface Input {
  id: string;
}

const groupSubscribersList: ActionDefinition<Input> = {
  key: "group-subscribers-list",
  type: "search",
  resource: "group",
  title: "List Subscribers In Group",
  description: "List every subscriber in the specified group.",
  params: [{ key: "id", label: "Group ID", type: "string", required: true }],
  output: [
    { key: "data", type: "array", label: "Subscribers" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).json<SenderListPage<unknown>>(
      `/groups/${encodeURIComponent(input.id)}/subscribers`,
    );
  },
};

export default groupSubscribersList;
