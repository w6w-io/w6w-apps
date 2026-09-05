import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";
import { listIdPathParam } from "../lib/params.ts";

/**
 * `GET /lists/{list_id}` — one list's details, including the fields (columns)
 * specific to it.
 */
interface Input {
  listId: number;
}

const listsGet: ActionDefinition<Input> = {
  key: "lists-get",
  type: "read",
  resource: "list",
  title: "Get List",
  description: "Fetch one List's details, including the list-specific fields defined on it.",
  params: [listIdPathParam],
  output: [{ key: "id", type: "number", label: "List ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/lists/${input.listId}`);
  },
};

export default listsGet;
