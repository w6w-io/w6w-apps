import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BrexClient, type BrexUser, compact } from "../lib/client.ts";
import { idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/users` — invite a new user as an employee.
 *
 * The three required fields are Brex's: `first_name`, `last_name`, `email`.
 * Everything else is an assignment — manager, department, location, title, cost
 * centre, legal entity — and `metadata` is the free-form bag Brex caps at 100
 * entries.
 *
 * "Invite" is literal: the user is created in the `INVITED` state and Brex sends
 * the invitation email. Changing a user's *role* is not part of this endpoint —
 * Brex's own page links out to a dashboard article for that.
 *
 * ## Idempotency
 *
 * Brex accepts an optional `Idempotency-Key` header here, and this action
 * forwards one when the caller supplies it. It does not synthesise one, so a
 * retry with no key invites a second user — pass a key (or filter by email
 * first) when the call is retried automatically.
 */
interface Input {
  firstName: string;
  lastName: string;
  email: string;
  managerId?: string;
  departmentId?: string;
  locationId?: string;
  titleId?: string;
  costCenterId?: string;
  legalEntityId?: string;
  metadata?: unknown;
  idempotencyKey?: string;
}

const userInvite: ActionDefinition<Input> = {
  key: "user-invite",
  type: "perform",
  resource: "user",
  title: "Invite User",
  description:
    "Invite a new user to Brex as an employee, optionally assigning a manager, department, " +
    "location, title, cost centre and legal entity. Brex sends the invitation email.",
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The invitation is sent here, and this address identifies the user afterwards.",
    },
    {
      key: "managerId",
      label: "Manager id",
      type: "string",
      advanced: true,
      hint: "User id of the manager. Take it from List Users.",
    },
    {
      key: "departmentId",
      label: "Department id",
      type: "string",
      advanced: true,
      hint: "Take it from List Departments.",
    },
    {
      key: "locationId",
      label: "Location id",
      type: "string",
      advanced: true,
      hint: "Take it from List Locations.",
    },
    {
      key: "titleId",
      label: "Title id",
      type: "string",
      advanced: true,
      hint: "Take it from List Titles.",
    },
    {
      key: "costCenterId",
      label: "Cost centre id",
      type: "string",
      advanced: true,
      hint: "Brex's `cost_center_id`.",
    },
    {
      key: "legalEntityId",
      label: "Legal entity id",
      type: "string",
      advanced: true,
      hint: "Take it from List Legal Entities.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      advanced: true,
      hint: 'JSON object of your own attributes, e.g. `{"employee_id": "E-1042"}`. Brex accepts ' +
        "at most 100 entries.",
    },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "User id" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status — INVITED for a fresh invitation" },
    { key: "department_id", type: "string", label: "Department id" },
    { key: "location_id", type: "string", label: "Location id" },
    { key: "title_id", type: "string", label: "Title id" },
    { key: "manager_id", type: "string", label: "Manager's user id" },
    { key: "metadata", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexUser>("/users", {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: compact({
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        manager_id: input.managerId,
        department_id: input.departmentId,
        location_id: input.locationId,
        title_id: input.titleId,
        cost_center_id: input.costCenterId,
        legal_entity_id: input.legalEntityId,
        metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "Metadata"),
      }),
    });
  },
};

export default userInvite;
