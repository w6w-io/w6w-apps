import type { ActionDefinition } from "@w6w/types";
import { gqlInput, PipefyClient, TABLE_RECORD_FIELDS } from "../lib/client.ts";

interface Input {
  id: string;
  title: string;
}

/**
 * `updateTableRecord(input: {id, title}) { table_record { id title } }` —
 * Pipefy's own reference example. To change a specific field's value, use
 * `setTableRecordFieldValue` via the `graphql-query` escape hatch (not
 * separately modeled here — see the README).
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { updateTableRecord(input: ${
    gqlInput(fields)
  }) { table_record { ${TABLE_RECORD_FIELDS} } } }`;

const tableRecordUpdate: ActionDefinition<Input> = {
  key: "table-record-update",
  type: "perform",
  resource: "table-record",
  title: "Update Table Record Title",
  description: "Rename a Database Table record.",
  idempotent: true,
  params: [
    { key: "id", label: "Record ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
  ],
  output: [{ key: "table_record", type: "object", label: "The updated record" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ updateTableRecord: { table_record: unknown } }>(
      buildQuery({ id: input.id, title: input.title }),
    );
    return data.updateTableRecord.table_record;
  },
};

export default tableRecordUpdate;
