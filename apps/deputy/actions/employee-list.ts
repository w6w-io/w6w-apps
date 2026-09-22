import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /resource/Employee` — every Employee record this token may see.
 *
 * The generated V1 reference describes the response as a bare JSON array of
 * `Employee` objects (no envelope) and says only: *"Returns Employee records
 * the authenticated caller is permitted to see. For large tables prefer
 * POST /QUERY with pagination."* The list form takes **no query parameters at
 * all** in the published specification — no `limit`, no `offset`, no `join` —
 * so this action offers none rather than inventing parameters that would be
 * ignored. Use `employee-search` when the table is large.
 *
 * **500 is the cap, and it is the server's.** Deputy's getting-started page
 * states it as a platform fact: *"The maximum amount of records included in a
 * single response is 500."* This action reports `count` so a caller can tell a
 * genuinely short list from a truncated one, and says so in the description
 * rather than silently returning a partial table.
 */
const action: ActionDefinition = {
  key: "employee-list",
  type: "read",
  resource: "employee",
  title: "List employees",
  description:
    "Every employee record this connection may see, in one response. Deputy caps a single " +
    "response at 500 records — use Search Employees to page a larger table.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Employee records" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deputy employees");
    const items = await new DeputyClient(ctx).list<Record<string, unknown>>("Employee");
    return { items, count: items.length };
  },
};

export default action;
