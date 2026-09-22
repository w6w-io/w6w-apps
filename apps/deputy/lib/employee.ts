import type { Param } from "@w6w/types";
import { asOptionalJson, compact } from "./client.ts";

/**
 * The Employee params shared by create and update, and the body they build.
 *
 * Field names are Employee's own documented properties (generated V1 reference,
 * `.../listemployee-1`, read 2026-09-22) — `FirstName`, `LastName`,
 * `DisplayName`, `Position`, `Company`, `Contact`, `Role`, `StartDate`,
 * `Active` — so nothing here is a friendly alias that Deputy would silently
 * ignore.
 *
 * ## `Additional fields` exists because the Employee schema is big and per-install
 *
 * The documented schema carries ~45 properties, including `CustomFieldData`
 * (whose columns are specific to each install), `Gender`/`Pronouns` (integer
 * lookups), `Photo`, `JobAppId` and payroll-side fields. Enumerating all of
 * them as form controls would be worse than useless — most are meaningless on
 * most installs — so the handful a scheduling workflow actually sets are named,
 * and everything else goes through `fields` using Deputy's own property names.
 * Values from `fields` are applied last, so they can also override a named
 * field deliberately.
 *
 * ## Why `required` is not simply copied from the spec
 *
 * In the generated reference a single `Employee` schema serves both the request
 * and the response, so its `required` array (`Id`, `Company`, `FirstName`,
 * `LastName`, `DisplayName`, `Contact`, `Active`, `Role`, `AllowAppraisal`,
 * `Modified`) lists fields the *server* always returns mixed in with fields a
 * create must supply. `FirstName`/`LastName` are required here because they are
 * the two names in that list a caller obviously must provide; the rest are
 * exposed without a `required` flag, and the create action's hint names the
 * four that a create may also need so an install that rejects the call says
 * which one it wanted rather than leaving the caller guessing.
 */
export interface EmployeeFields {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  position?: string;
  company?: number;
  contact?: number;
  role?: number;
  startDate?: string;
  active?: boolean;
  fields?: unknown;
}

export const FIRST_NAME_PARAM: Param = {
  key: "firstName",
  label: "First name",
  type: "string",
  required: true,
  hint: "Sent as `FirstName` — Deputy's own property name, 64 characters maximum.",
};

export const LAST_NAME_PARAM: Param = {
  key: "lastName",
  label: "Last name",
  type: "string",
  required: true,
  hint: "Sent as `LastName`, 64 characters maximum.",
};

export const EMPLOYEE_FIELD_PARAMS: Param[] = [
  {
    key: "displayName",
    label: "Display name",
    type: "string",
    hint: "Sent as `DisplayName` — what rosters and timesheets show, 255 characters maximum.",
  },
  {
    key: "position",
    label: "Position",
    type: "string",
    hint: "Sent as `Position`, a free-text job title (255 characters maximum).",
  },
  {
    key: "company",
    label: "Location (Company) ID",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Sent as `Company` — the id of the Deputy Location this employee belongs to, from " +
      "Locations. Note this is Deputy's `Company` object, which the UI calls a Location.",
  },
  {
    key: "contact",
    label: "Contact ID",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Sent as `Contact` — the id of the Contact record holding this employee's phone, " +
      "email and address fields.",
  },
  {
    key: "role",
    label: "Role ID",
    type: "number",
    validation: { integer: true, min: 1 },
    hint: "Sent as `Role` — an integer lookup into this install's access roles.",
  },
  {
    key: "startDate",
    label: "Start date",
    type: "string",
    placeholder: "2026-09-22T00:00:00+10:00",
    hint: "Sent as `StartDate`. Deputy's schema types this as a date-time string, so include " +
      "the time and offset rather than a bare date.",
  },
  {
    key: "fields",
    label: "Additional fields",
    type: "json",
    hint: "Any other Employee property, using Deputy's own names — e.g. " +
      '`{"Active": false, "Salutation": "Dr", "Role": 2}`. Discover what this install has ' +
      "with Get employee fields.",
  },
];

/** Turn the form values into Deputy's own Employee body, dropping anything unset. */
export function employeeBody(input: EmployeeFields): Record<string, unknown> {
  const extra = asOptionalJson<Record<string, unknown>>(input.fields, "Additional fields") ?? {};
  return compact({
    FirstName: input.firstName,
    LastName: input.lastName,
    DisplayName: input.displayName,
    Position: input.position,
    Company: input.company,
    Contact: input.contact,
    Role: input.role,
    StartDate: input.startDate,
    Active: typeof input.active === "boolean" ? input.active : undefined,
    ...extra,
  });
}
