import type { ActionDefinition } from "@w6w/types";
import { gqlArgs, PAGE_INFO, PipefyClient, TABLE_RECORD_FIELDS } from "../lib/client.ts";

interface Input {
  tableId: string;
  first?: number;
  after?: string;
}

/**
 * `{ table_records(table_id, first, after) { edges { node { ... } }
 * pageInfo { endCursor } totalCount } }` — Pipefy's own Table Records doc
 * example, plus the same Relay-style `first`/`after` pagination confirmed
 * on the sibling `tables` connection (see `card-list`'s comment).
 */
function buildQuery(fields: Record<string, unknown>): string {
  const args = gqlArgs(fields);
  return `{ table_records(${args}) {
    edges { node { ${TABLE_RECORD_FIELDS} } }
    ${PAGE_INFO}
  } }`;
}

const tableRecordList: ActionDefinition<Input> = {
  key: "table-record-list",
  type: "read",
  resource: "table-record",
  title: "List Table Records",
  description: "List records in a Database Table.",
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true },
    { key: "first", label: "Page size", type: "number", default: 20 },
    { key: "after", label: "Cursor (from a previous page's endCursor)", type: "string" },
  ],
  output: [
    { key: "table_records", type: "array", label: "Records" },
    { key: "endCursor", type: "string", label: "Cursor for the next page" },
    { key: "totalCount", type: "number", label: "Total records" },
  ],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{
      table_records: {
        edges: Array<{ node: unknown }>;
        pageInfo: { endCursor: string | null };
        totalCount: number;
      };
    }>(buildQuery({ table_id: input.tableId, first: input.first ?? 20, after: input.after }));
    return {
      table_records: data.table_records.edges.map((e) => e.node),
      endCursor: data.table_records.pageInfo.endCursor,
      totalCount: data.table_records.totalCount,
    };
  },
};

export default tableRecordList;
