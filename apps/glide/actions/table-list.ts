import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";

/**
 * `GET /tables` — list every Big Table the connection's team owns.
 *
 * Glide's own description is explicit: this returns **only Big Tables** — none
 * of the team's other data sources (Google Sheets, Airtable, the
 * spreadsheet-backed "Glide Tables" most apps are built on) show up here, even
 * though they belong to the same team.
 */
interface Output {
  data: Array<{ id: string; name: string }>;
}

const tableList: ActionDefinition<Record<string, never>, Output> = {
  key: "table-list",
  type: "search",
  resource: "table",
  title: "List Tables",
  description: "List every Big Table this connection's team owns. Only Big Tables are returned.",
  params: [],
  output: [{ key: "data", type: "array", label: "Tables (id, name)" }],

  async execute(_input, ctx) {
    const data = await new GlideClient(ctx).data<Output["data"]>("/tables");
    return { data: data ?? [] };
  },
};

export default tableList;
