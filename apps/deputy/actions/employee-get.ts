import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import { ID_PARAM } from "../lib/params.ts";

interface Input {
  id: number;
}

/**
 * `GET /resource/Employee/{id}` — one Employee record.
 *
 * Verified against the generated V1 reference
 * (`developer.deputy.com/reference/getemployeebyid-1`, read 2026-09-22): the
 * path is `/resource/Employee/{id}` and the response is a single `Employee`
 * object — the same schema `GET /resource/Employee` returns in an array, whose
 * documented properties include `Id`, `Company`, `FirstName`, `LastName`,
 * `DisplayName`, `OtherName`, `Salutation`, `MainAddress`, `Contact`,
 * `DateOfBirth`, `Gender`, `UserId`, `Active`, `StartDate`, `TerminationDate`,
 * `EmploymentEndDate`, `Position`, `Role`, `CustomFieldData`, `Created` and
 * `Modified`.
 *
 * The record is returned whole rather than projected: installs differ in which
 * custom fields exist (`CustomFieldData`, `DirtyDeputecUserAsEmployeeProfile`),
 * and a workflow that only saw the fields this app happened to name would lose
 * them silently.
 */
const action: ActionDefinition<Input> = {
  key: "employee-get",
  type: "read",
  resource: "employee",
  title: "Get employee",
  description: "Get one employee record by its Deputy id.",
  params: [
    ID_PARAM(
      "Employee ID",
      "Deputy's internal Employee id (`Id`), not a payroll or external id.",
    ),
  ],
  output: [
    { key: "Id", type: "number", label: "Employee ID" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "DisplayName", type: "string", label: "Display name" },
    { key: "Position", type: "string", label: "Position" },
    { key: "Company", type: "number", label: "Location (Company) ID" },
    { key: "Active", type: "boolean", label: "Active" },
    { key: "Modified", type: "string", label: "Last modified" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "getting Deputy employee", { id: input.id });
    return await new DeputyClient(ctx).get("Employee", input.id);
  },
};

export default action;
