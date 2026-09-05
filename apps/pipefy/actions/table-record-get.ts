import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PipefyClient, TABLE_RECORD_FIELDS } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `{ table_record(id) { ...TABLE_RECORD_FIELDS } }` — Pipefy's own Table
 * Records doc example.
 */
const buildQuery = (id: string) =>
  `{ table_record(id: ${gqlLiteral(id)}) { ${TABLE_RECORD_FIELDS} } }`;

const tableRecordGet: ActionDefinition<Input> = {
  key: "table-record-get",
  type: "read",
  resource: "table-record",
  title: "Get Table Record",
  description: "Get a single Database Table record by ID, including its field values.",
  params: [
    { key: "id", label: "Record ID", type: "string", required: true },
  ],
  output: [{ key: "table_record", type: "object", label: "The record" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ table_record: unknown }>(
      buildQuery(input.id),
    );
    return data.table_record;
  },
};

export default tableRecordGet;
