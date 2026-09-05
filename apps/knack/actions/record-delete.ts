import type { ActionDefinition } from "@w6w/types";
import { KnackClient } from "../lib/client.ts";
import { objectKeyParam, recordIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/objects/{object_key}/records/{record_id}` — delete a record.
 *
 * `docs.knack.com/reference/object-based-delete`. Answers `200 {"delete": true}`
 * on success — there is no soft-delete or trash to restore from.
 *
 * Idempotent in the sense the runtime cares about: retrying cannot delete a
 * second record. A second attempt against an already-deleted id is expected
 * to fail rather than repeat `{"delete": true}`, since Knack has no record left
 * to act on — this is not confirmed against a live app (deleting is
 * destructive to try twice against a real Object) and is called out here
 * rather than assumed silently.
 */
interface Input {
  objectKey: string;
  recordId: string;
}

const recordDelete: ActionDefinition<Input> = {
  key: "record-delete",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Permanently delete a single record. There is no trash to recover it from.",
  idempotent: true,
  params: [objectKeyParam, recordIdParam],
  output: [
    { key: "delete", type: "boolean", label: "Whether the record was deleted" },
  ],

  execute(input, ctx) {
    return new KnackClient(ctx).deleteRecord(input.objectKey, input.recordId);
  },
};

export default recordDelete;
