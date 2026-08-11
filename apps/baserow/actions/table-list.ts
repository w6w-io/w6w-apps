import type { ActionDefinition } from "@w6w/types";
import { BaserowClient } from "../lib/client.ts";

/**
 * `GET /api/database/tables/all-tables/` — every table this token can reach.
 *
 * This is the discovery action, and it is the only endpoint in Baserow's API
 * whose sole accepted security scheme is the database token: it exists to answer
 * "what can this token see?". Every other row action needs a `tableId`, and this
 * is where that number comes from.
 *
 * It takes no parameters and is not paginated — a token is scoped to one
 * database, so the answer is small by construction.
 */
const tableList: ActionDefinition<Record<string, never>> = {
  key: "table-list",
  type: "search",
  resource: "table",
  title: "List Tables",
  description:
    "List every table this connection's token can reach, with its id and database id. Start here " +
    "to find the Table ID the row actions need.",
  params: [],
  output: [
    { key: "[]", type: "array", label: "Tables — a bare array of `{id, name, database_id}`" },
  ],

  execute(_input, ctx) {
    return new BaserowClient(ctx).request("/api/database/tables/all-tables/");
  },
};

export default tableList;
