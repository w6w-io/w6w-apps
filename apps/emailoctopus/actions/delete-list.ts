import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
}

/**
 * `DELETE /lists/{list_id}` — 204, no body.
 *
 * `idempotent: true`: a replay hits a list that is already gone and returns 404,
 * which is safe to retry in the sense that matters — it cannot delete a second
 * thing. Destructive, though: every contact on the list goes with it.
 */
const deleteList: ActionDefinition<Input> = {
  key: "delete-list",
  type: "perform",
  resource: "list",
  title: "Delete List",
  description:
    "Permanently delete a list and every contact on it. Returns 204 with no body; a repeat call returns 404.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Always true when the call succeeded" }],

  async execute(input, ctx) {
    await new EmailOctopusClient(ctx).request(`/lists/${seg(input.listId)}`, { method: "DELETE" });
    return { deleted: true };
  },
};

export default deleteList;
