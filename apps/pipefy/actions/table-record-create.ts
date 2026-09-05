import type { ActionDefinition } from "@w6w/types";
import { gqlInput, jsonArrayArg, PipefyClient, TABLE_RECORD_FIELDS } from "../lib/client.ts";

interface Input {
  tableId: string;
  title?: string;
  fields?: unknown;
}

/**
 * `createTableRecord(input: {table_id, title, fields_attributes: {field_id,
 * field_value}}) { table_record { id } }` — Pipefy's own reference example.
 *
 * The doc's own example passes `fields_attributes` as a bare object rather
 * than an array — but GraphQL's List Input Coercion (a single non-list
 * value passed where a list type is expected is coerced to a one-item
 * list, per the GraphQL spec) means this is consistent with the field
 * being a list type, exactly like `createCard`'s equivalently-shaped
 * `fields_attributes`. This action always emits an array, which is valid
 * either way.
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { createTableRecord(input: ${
    gqlInput(fields)
  }) { table_record { ${TABLE_RECORD_FIELDS} } } }`;

const tableRecordCreate: ActionDefinition<Input> = {
  key: "table-record-create",
  type: "perform",
  resource: "table-record",
  title: "Create Table Record",
  description: "Create a record in a Database Table, optionally filling in field values.",
  idempotent: false,
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string" },
    {
      key: "fields",
      label: "Field values",
      type: "json",
      hint: 'Array of { "field_id": "...", "field_value": "..." } pairs.',
    },
  ],
  output: [{ key: "table_record", type: "object", label: "The created record" }],

  async execute(input, ctx) {
    const fields_attributes = jsonArrayArg(input.fields, "fields");
    const data = await new PipefyClient(ctx).send<{ createTableRecord: { table_record: unknown } }>(
      buildQuery({ table_id: input.tableId, title: input.title, fields_attributes }),
    );
    return data.createTableRecord.table_record;
  },
};

export default tableRecordCreate;
