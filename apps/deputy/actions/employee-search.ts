import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import { buildQueryBody, QUERY_PARAMS, type QueryInput, searchPage } from "../lib/params.ts";

/**
 * `POST /resource/Employee/QUERY` — filter, sort and page employees in one call.
 *
 * The generated V1 reference names this the right way to read a large table:
 * *"Returns Employee records the authenticated caller is permitted to see. For
 * large tables prefer POST /QUERY with pagination."* The same page documents the
 * payload this action builds — `search`, `sort`, `start`, `max`, `join` — and
 * carries the example `{"search": {"s1": {"field": "Id", "data": 1, "type":
 * "eq"}}}`.
 *
 * `join` is where an Employee read gets useful: Deputy expands related ORMs
 * inline, so `CompanyObject` / `ContactObject` / `RoleObject` arrive as nested
 * objects instead of bare integer ids — one request rather than four.
 *
 * Paging is an offset, not an opaque cursor (`start`, 0-indexed, plus `max`,
 * server-capped at 500). `nextCursor` is offered back whenever a page came back
 * exactly full, since a full page may have a successor; a short page is the end
 * of the table.
 */
interface Input extends QueryInput {
  search?: unknown;
  sort?: unknown;
  join?: string;
  max?: number;
  cursor?: number;
}

const action: ActionDefinition<Input> = {
  key: "employee-search",
  type: "search",
  resource: "employee",
  title: "Search employees",
  description:
    "Filter, sort and page employees with Deputy's own QUERY body, expanding related objects " +
    "inline where useful.",
  params: QUERY_PARAMS,
  output: [
    { key: "items", type: "array", label: "Employee records" },
    { key: "count", type: "number", label: "Records in this page" },
    { key: "start", type: "number", label: "Offset this page started at" },
    { key: "max", type: "number", label: "Page size requested" },
    {
      key: "nextCursor",
      type: "number",
      label: "Offset to pass back as cursor (absent when the table ended)",
    },
  ],

  async execute(input, ctx) {
    ctx.log("info", "searching Deputy employees", { max: input.max, cursor: input.cursor });
    const items = await new DeputyClient(ctx).query<Record<string, unknown>>(
      "Employee",
      buildQueryBody(input),
    );
    return searchPage(items, input);
  },
};

export default action;
