import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import {
  EMPLOYEE_FIELD_PARAMS,
  employeeBody,
  type EmployeeFields,
  FIRST_NAME_PARAM,
  LAST_NAME_PARAM,
} from "../lib/employee.ts";
import { ID_PARAM } from "../lib/params.ts";

interface Input extends EmployeeFields {
  id: number;
}

/**
 * `POST /resource/Employee/{id}` — update an Employee.
 *
 * Verified against the generated V1 reference
 * (`developer.deputy.com/reference/updateemployee-1`, read 2026-09-22): the V1
 * Resource API exposes **exactly one update verb, `POST …/{id}`** — there is no
 * `PATCH` and no `PUT` sibling anywhere in the spec, unlike Mautic's `/edit`
 * routes. So this action is built to never surprise a caller: only the fields
 * that were filled in are sent, and an omitted field is not sent at all.
 * Deputy does not document what a partial body does to unlisted fields, so
 * nothing here relies on either behaviour — it simply never sends an empty one.
 *
 * The response is the updated `Employee`, and the call is idempotent in the
 * sense this pack means it: replaying the identical body lands the record in
 * the identical state.
 */
const action: ActionDefinition<Input> = {
  key: "employee-update",
  type: "perform",
  resource: "employee",
  title: "Update employee",
  description:
    "Update an employee's fields. Only the fields you fill in are sent, so this behaves like " +
    "an edit rather than a replace — nothing else on the record is blanked.",
  idempotent: true,
  params: [
    ID_PARAM("Employee ID", "Deputy's internal Employee id (`Id`) to update."),
    { ...FIRST_NAME_PARAM, required: false },
    { ...LAST_NAME_PARAM, required: false },
    ...EMPLOYEE_FIELD_PARAMS,
    {
      key: "active",
      label: "Active",
      type: "boolean",
      hint: "Sent as `Active` only when you touch it — true reactivates, false deactivates. Left " +
        "alone the field is not sent, so the employee's current state is untouched.",
    },
  ],
  output: [
    { key: "Id", type: "number", label: "Employee ID" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "DisplayName", type: "string", label: "Display name" },
    { key: "Active", type: "boolean", label: "Active" },
    { key: "Modified", type: "string", label: "Last modified" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "updating Deputy employee", { id: input.id });
    return await new DeputyClient(ctx).update("Employee", input.id, employeeBody(input));
  },
};

export default action;
