import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";
import { tableIdParam } from "../lib/params.ts";

/**
 * `GET /tables/{tableID}/rows` — page through a Big Table's rows.
 *
 * Whether or not you set `limit`, Glide may require several requests to
 * retrieve every row: when more remain, the response carries a `continuation`
 * token — feed it back in as `continuation` to fetch the next page. Its
 * absence means this page is the last one.
 */
interface Input {
  tableId: string;
  limit?: number;
  continuation?: string;
}

interface Output {
  data: Array<Record<string, unknown>>;
  continuation?: string;
}

const rowsList: ActionDefinition<Input, Output> = {
  key: "rows-list",
  type: "search",
  resource: "row",
  title: "Get Rows",
  description: "Page through a Big Table's rows.",
  params: [
    tableIdParam,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Maximum rows to return in this page.",
    },
    {
      key: "continuation",
      label: "Continuation token",
      type: "string",
      hint: "From a previous call's `continuation` output, to fetch the next page.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Rows for this page" },
    { key: "continuation", type: "string", label: "Token for the next page, if any remain" },
  ],

  execute(input, ctx) {
    return new GlideClient(ctx).json<Output>(
      `/tables/${encodeURIComponent(input.tableId)}/rows`,
      { query: { limit: input.limit, continuation: input.continuation } },
    );
  },
};

export default rowsList;
