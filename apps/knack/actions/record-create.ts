import type { ActionDefinition } from "@w6w/types";
import { asJson, KnackClient } from "../lib/client.ts";
import { fieldsParam, objectKeyParam } from "../lib/params.ts";

/**
 * `POST /v1/objects/{object_key}/records` — create a record.
 *
 * `docs.knack.com/reference/object-based-post`. The body is exactly the field
 * values to set, keyed by this Object's own `field_N` keys — Knack's response
 * echoes the created record, including its new `id`.
 *
 * **Not idempotent.** Knack documents no idempotency key on this endpoint, so
 * retrying a failed create risks a duplicate record. Use
 * `ctx.invocation.invocationId` upstream (e.g. a filter check via List Records
 * before creating) if a workflow needs at-most-once behaviour.
 */
interface Input {
  objectKey: string;
  fields: unknown;
}

const recordCreate: ActionDefinition<Input> = {
  key: "record-create",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description: "Create a record from field values. Returns the created record, including its id.",
  idempotent: false,
  params: [objectKeyParam, fieldsParam],
  output: [
    { key: "id", type: "string", label: "The created record's id" },
  ],

  execute(input, ctx) {
    const fields = asJson<Record<string, unknown>>(input.fields, "Field values");
    return new KnackClient(ctx).createRecord(input.objectKey, fields);
  },
};

export default recordCreate;
