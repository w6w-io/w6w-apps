import type { ActionDefinition } from "@w6w/types";
import { gqlLiteral, PipefyClient, TABLE_FIELDS } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `{ table(id) { ...TABLE_FIELDS, table_fields{id label} } }` — Pipefy's
 * own "Objects Within Table" example (its `members`/`table_records`/
 * `webhooks` sub-selections are left out here — the latter has its own
 * dedicated `table-record-list` action).
 */
const buildQuery = (id: string) =>
  `{ table(id: ${gqlLiteral(id)}) { ${TABLE_FIELDS} table_fields { id label } } }`;

const tableGet: ActionDefinition<Input> = {
  key: "table-get",
  type: "read",
  resource: "table",
  title: "Get Database Table",
  description: "Get a Database Table by ID, including its field definitions.",
  params: [
    {
      key: "id",
      label: "Table ID",
      type: "string",
      required: true,
      hint: "Alphanumeric, e.g. ZtEdWh.",
    },
  ],
  output: [{ key: "table", type: "object", label: "The table" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ table: unknown }>(buildQuery(input.id));
    return data.table;
  },
};

export default tableGet;
