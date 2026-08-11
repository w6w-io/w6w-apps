import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
}

/** `GET /lists/{list_id}`. */
const getList: ActionDefinition<Input> = {
  key: "get-list",
  type: "read",
  resource: "list",
  title: "Get List",
  description:
    "Fetch a single list by id, including its custom field definitions, its tags, and its pending/subscribed/unsubscribed counts.",
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
  ],
  output: [
    { key: "id", type: "string", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "double_opt_in", type: "boolean", label: "Double opt-in enabled" },
    { key: "fields", type: "array", label: "Custom field definitions" },
    { key: "tags", type: "array", label: "Tags defined on the list" },
    { key: "counts", type: "object", label: "Contact counts by status" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
    { key: "last_updated_at", type: "string", label: "Last updated at (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}`);
  },
};

export default getList;
