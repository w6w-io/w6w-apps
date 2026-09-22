import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, BrexClient, type BrexUser, compact, encodeId } from "../lib/client.ts";
import { idempotencyKeyParam, userIdParam, userStatusUpdateOptions } from "../lib/params.ts";

/**
 * `PUT /v2/users/{id}` — update a user. "Any parameters not provided will be
 * left unchanged."
 *
 * ## Suspending a user is `status`, and only two values are accepted
 *
 * Brex: "To suspend a user, set status to 'disabled'. To unsuspend a user, set
 * status to 'active'." The six-value enum from the list filter is **not** valid
 * here, which is why the two live in different constants in `lib/params.ts`.
 *
 * ## `legal_entity_id` cannot be unset
 *
 * Brex marks that one field `(string)` where every other field here is
 * `(string,null)`, and says "Cannot be null". The app does not offer a way to
 * blank it, because the API does not have one.
 *
 * ## Idempotent
 *
 * `PUT` with unset fields left unchanged: the same input always lands on the
 * same user state, which is what the runtime's retry policy needs to know.
 */
interface Input {
  id: string;
  status?: string;
  managerId?: string;
  departmentId?: string;
  locationId?: string;
  titleId?: string;
  costCenterId?: string;
  legalEntityId?: string;
  metadata?: unknown;
  idempotencyKey?: string;
}

const userUpdate: ActionDefinition<Input> = {
  key: "user-update",
  type: "perform",
  resource: "user",
  title: "Update User",
  description:
    "Update a Brex user's status (suspend or unsuspend), manager, department, location, title, " +
    "cost centre, legal entity or metadata. Fields left empty are unchanged.",
  idempotent: true,
  params: [
    userIdParam,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: userStatusUpdateOptions,
      hint: "The only statuses an update accepts. Leave empty to leave the user's status alone — " +
        "invited, pending-activation and inactive users are set by Brex's own flows.",
    },
    {
      key: "managerId",
      label: "Manager id",
      type: "string",
      advanced: true,
      hint: "User id of the new manager.",
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
    },
    {
      key: "legalEntityId",
      label: "Legal entity id",
      type: "string",
      advanced: true,
      hint: "Brex does not allow this field to be cleared, only changed.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      advanced: true,
      hint: "JSON object of your own attributes. Brex accepts at most 100 entries.",
    },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "User id" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status after the update" },
    { key: "manager_id", type: "string", label: "Manager's user id" },
    { key: "department_id", type: "string", label: "Department id" },
    { key: "location_id", type: "string", label: "Location id" },
    { key: "title_id", type: "string", label: "Title id" },
    { key: "cost_center_id", type: "string", label: "Cost centre id" },
    { key: "legal_entity_id", type: "string", label: "Legal entity id" },
    { key: "metadata", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexUser>(`/users/${encodeId(input.id)}`, {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      body: compact({
        status: input.status,
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

export default userUpdate;
