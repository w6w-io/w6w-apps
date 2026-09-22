import type { ActionDefinition } from "@w6w/types";
import { DeputyClient } from "../lib/client.ts";
import {
  EMPLOYEE_FIELD_PARAMS,
  employeeBody,
  type EmployeeFields,
  FIRST_NAME_PARAM,
  LAST_NAME_PARAM,
} from "../lib/employee.ts";

/**
 * `POST /resource/Employee` — create an Employee.
 *
 * Verified against the generated V1 reference
 * (`developer.deputy.com/reference/createemployee-1`, read 2026-09-22): the
 * body is an `Employee` object and the response is the created `Employee`.
 *
 * **Not idempotent.** Deputy documents no idempotency key and the Employee
 * schema has no caller-supplied natural key (`OnboardingId` and `ExternalLinkId`
 * exist but are described as opaque ids, not uniqueness constraints), so a
 * retry creates a second employee. Deputy's own "Adding an Employee" guide, by
 * contrast, uses the V2 API — out of scope here, and worth knowing when a
 * caller needs a de-duplicating add.
 */
const action: ActionDefinition<EmployeeFields> = {
  key: "employee-create",
  type: "perform",
  resource: "employee",
  title: "Create employee",
  description:
    "Create an employee record. There is no Active control: Deputy's own default applies, and " +
    'an inactive record is created by passing `{"Active": false}` through Additional fields. ' +
    "The reference also lists Company, Contact, Role and AllowAppraisal as required fields of " +
    "an Employee, so an install that rejects the call may be asking for one of them.",
  idempotent: false,
  params: [
    FIRST_NAME_PARAM,
    LAST_NAME_PARAM,
    ...EMPLOYEE_FIELD_PARAMS,
  ],
  output: [
    { key: "Id", type: "number", label: "New employee ID" },
    { key: "FirstName", type: "string", label: "First name" },
    { key: "LastName", type: "string", label: "Last name" },
    { key: "DisplayName", type: "string", label: "Display name" },
    { key: "Active", type: "boolean", label: "Active" },
    { key: "Modified", type: "string", label: "Last modified" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "creating a Deputy employee", {});
    return await new DeputyClient(ctx).create("Employee", employeeBody(input));
  },
};

export default action;
