import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";
import { listIdPathParam } from "../lib/params.ts";

/** `GET /lists/{list_id}/list-entries/{list_entry_id}`. */
interface Input {
  listId: number;
  listEntryId: number;
}

const listEntriesGet: ActionDefinition<Input> = {
  key: "list-entries-get",
  type: "read",
  resource: "list-entry",
  title: "Get List Entry",
  description: "Fetch one entry (row) on a List.",
  params: [
    listIdPathParam,
    {
      key: "listEntryId",
      label: "List Entry ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: [{ key: "id", type: "number", label: "List Entry ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(
      `/lists/${input.listId}/list-entries/${input.listEntryId}`,
    );
  },
};

export default listEntriesGet;
