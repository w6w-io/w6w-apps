import type { ActionDefinition } from "@w6w/types";
import { BaserowClient, parseRowIds } from "../lib/client.ts";

/**
 * `GET /api/database/rows/names/` — resolve row ids to their primary-field
 * values.
 *
 * The parameter is dynamically named: `?table__{table_id}=1,2,3`, and the
 * response is keyed the same way — `{"42": {"1": "Ada", "2": "Grace"}}`.
 *
 * The use for it is link-row fields. A row that links to another table gives you
 * ids; this turns a page of them into names in **one** request instead of one
 * Get Row per id. That is the whole reason it earns a place next to the CRUD
 * actions.
 */
interface Input {
  tableId: number;
  rowIds: string;
}

const rowNames: ActionDefinition<Input> = {
  key: "row-names",
  type: "read",
  resource: "row",
  title: "Get Row Names",
  description:
    "Resolve a list of row ids to their primary-field values in one request — the cheap way to " +
    "turn link-row ids into names.",
  params: [
    {
      key: "tableId",
      label: "Table ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The table the ids belong to — usually the *target* of a link-row field.",
    },
    {
      key: "rowIds",
      label: "Row IDs",
      type: "string",
      required: true,
      placeholder: "1,2,3",
      hint: "Comma-separated row ids from that table.",
    },
  ],
  output: [
    {
      key: "{tableId}",
      type: "object",
      label: 'Keyed by table id, then by row id — `{"42": {"1": "Ada"}}`',
    },
  ],

  execute(input, ctx) {
    // Parsed rather than forwarded verbatim so a stray non-numeric id is named
    // here instead of coming back as an opaque 400.
    const ids = parseRowIds(input.rowIds);
    return new BaserowClient(ctx).request("/api/database/rows/names/", {
      query: { [`table__${input.tableId}`]: ids.join(",") },
    });
  },
};

export default rowNames;
