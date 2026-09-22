import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";

/**
 * `GET /resource/OperationalUnit` — the Areas an install is divided into.
 *
 * Deputy's own resource index is explicit about the vocabulary mismatch:
 * *"Operational Units are called Areas in the Deputy UI."* The generated
 * reference describes the list as *"Returns OperationalUnit records the
 * authenticated caller is permitted to see. For large tables prefer POST /QUERY
 * with pagination."* — and in practice Areas are few (a location has a handful),
 * so the list form is the right one. No query parameters are documented on it.
 *
 * Documented properties: `Id`, `Company`, `OperationalUnitName`, `WorkType`,
 * `ParentOperationalUnit`, `Active`, `PayrollExportName`, `Address`, `Contact`,
 * `RosterSortOrder`, `ShowOnRoster`, `Colour`, `DailyRosterBudget`,
 * `OperationalUnitType` and `Modified`. `Company` is the parent Location, and
 * `ParentOperationalUnit` makes the hierarchy explicit — an Area can sit under
 * another Area.
 */
const action: ActionDefinition = {
  key: "operational-unit-list",
  type: "read",
  resource: "operational-unit",
  title: "List areas",
  description:
    "Every Area (Deputy's OperationalUnit) this connection may see, with its parent Location, " +
    "parent Area and roster settings.",
  params: [],
  output: [
    { key: "items", type: "array", label: "OperationalUnit (Area) records" },
    { key: "count", type: "number", label: "Records returned" },
  ],

  async execute(_input, ctx) {
    ctx.log("info", "listing Deputy areas");
    const items = await new DeputyClient(ctx).list<Record<string, unknown>>("OperationalUnit");
    return { items, count: items.length };
  },
};

export default action;
