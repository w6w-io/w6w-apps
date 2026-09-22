import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /resource/Leave` — every leave request this token may see.
 *
 * The `Leave` resource is documented as *"Holds all leave requests for an
 * account"* (Deputy's resource index, read 2026-09-22), and the generated
 * reference describes the list as *"Returns Leave records the authenticated
 * caller is permitted to see. For large tables prefer POST /QUERY with
 * pagination."* The list form takes no documented query parameters, so none are
 * offered here.
 *
 * The documented `Leave` properties are `Id`, `Employee`, `EmployeeHistory`,
 * `Company`, `LeaveRule`, `Start`/`DateStart`, `End`/`DateEnd`, `Days`,
 * `ApproverTime`, `ApproverPay`, `Comment`, `Status`, `ApprovalComment`,
 * `TotalHours`, `ExternalId`, `AllDay`, `Creator`, `Created` and `Modified`.
 * Two things are worth knowing before reading a row: **`Status` is an integer
 * lookup**, not a string, and `Start`/`End` are Unix timestamps while
 * `DateStart`/`DateEnd` are date-times — Deputy returns both views of the same
 * window, and the schema's `required` list names the integer pair.
 *
 * Leave is read-only here: this app does not create or approve leave requests.
 * Deputy's hand-written guides cover adding leave for an employee
 * (`intEmployeeId` + `DateStart`/`DateEnd`), but the generated V1 reference
 * exposes no create/update page for the `Leave` resource itself, so the write
 * path could not be verified against Deputy's own reference and was left out.
 */
const action: ActionDefinition = {
  key: "leave-list",
  type: "read",
  resource: "leave",
  title: "List leave requests",
  description:
    "Every leave request this connection may see, in one response (Deputy caps a response at " +
    "500 records). Read `Status` as an integer lookup and `DateStart`/`DateEnd` as the " +
    "date-time view of the same window as `Start`/`End`.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Leave records" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deputy leave requests");
    const items = await new DeputyClient(ctx).list<Record<string, unknown>>("Leave");
    return { items, count: items.length };
  },
};

export default action;
