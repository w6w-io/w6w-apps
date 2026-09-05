import type { ActionDefinition } from "@w6w/types";
import { asJson, KnackClient } from "../lib/client.ts";
import { fieldsParam, objectKeyParam, recordIdParam } from "../lib/params.ts";

/**
 * `PUT /v1/objects/{object_key}/records/{record_id}` — update a record.
 *
 * `docs.knack.com/reference/object-based-put`. Knack's own example sends only
 * the fields being changed and leaves the rest of the record untouched, so
 * `fields` is passed through verbatim rather than merged with anything.
 *
 * Idempotent: re-sending the same field values converges on the same record.
 */
interface Input {
  objectKey: string;
  recordId: string;
  fields: unknown;
}

const recordUpdate: ActionDefinition<Input> = {
  key: "record-update",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Update a record's field values. Fields left out of the payload are unchanged.",
  idempotent: true,
  params: [objectKeyParam, recordIdParam, fieldsParam],
  output: [
    { key: "id", type: "string", label: "The updated record's id" },
  ],

  execute(input, ctx) {
    const fields = asJson<Record<string, unknown>>(input.fields, "Field values");
    return new KnackClient(ctx).updateRecord(input.objectKey, input.recordId, fields);
  },
};

export default recordUpdate;
