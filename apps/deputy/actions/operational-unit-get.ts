import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import { ID_PARAM } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `GET /resource/OperationalUnit/{id}` — one Area.
 *
 * Verified against the generated V1 reference
 * (`developer.deputy.com/reference/getoperationalunitbyid-1`, read 2026-09-22).
 * Useful as its own read because it is the id every timesheet and roster write
 * asks for: `intOpunitId` on `timesheet-start` and `timesheet-create-or-update`,
 * and `OperationalUnit` on a Timesheet row.
 */
const action: ActionDefinition<Input> = {
  key: "operational-unit-get",
  type: "read",
  resource: "operational-unit",
  title: "Get area",
  description: "Get one Area (OperationalUnit) by its Deputy id.",
  params: [
    ID_PARAM("Area ID", "Deputy's internal OperationalUnit id, e.g. from List Areas."),
  ],
  output: [
    { key: "Id", type: "number", label: "Area ID" },
    { key: "OperationalUnitName", type: "string", label: "Area name" },
    { key: "Company", type: "number", label: "Parent Location (Company) ID" },
    { key: "ParentOperationalUnit", type: "number", label: "Parent Area ID" },
    { key: "Active", type: "boolean", label: "Active" },
    { key: "ShowOnRoster", type: "boolean", label: "Shown on roster" },
    { key: "Modified", type: "string", label: "Last modified" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting a Deputy area", { id: input.id });
    return await new DeputyClient(ctx).get("OperationalUnit", input.id);
  },
};

export default action;
