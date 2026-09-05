import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";
import { listIdPathParam } from "../lib/params.ts";

/**
 * `DELETE /lists/{list_id}/list-entries/{list_entry_id}`.
 *
 * Also deletes any list-specific field values on the entry. If the list is
 * an Opportunity list, this deletes the opportunity itself — an opportunity
 * can only ever have one list entry.
 */
interface Input {
  listId: number;
  listEntryId: number;
}

const listEntriesDelete: ActionDefinition<Input> = {
  key: "list-entries-delete",
  type: "perform",
  resource: "list-entry",
  title: "Remove Entry From List",
  description:
    "Delete a List Entry. If the list holds Opportunities, this deletes the opportunity too.",
  idempotent: true,
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
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(
      `/lists/${input.listId}/list-entries/${input.listEntryId}`,
    );
  },
};

export default listEntriesDelete;
