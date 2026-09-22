import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexUser, encodeId } from "../lib/client.ts";
import { loadCustomFieldsParam, userIdParam } from "../lib/params.ts";

/**
 * `GET /v2/users/{id}` — one user by id.
 *
 * The id is path-escaped, so a pasted value with a `/` or `?` becomes exactly
 * what was pasted rather than a different request.
 *
 * `load_custom_fields` is off by default, matching Brex: the user's
 * `custom_fields` array is only populated when it is on.
 */
interface Input {
  id: string;
  loadCustomFields?: boolean;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one Brex user by id.",
  params: [userIdParam, loadCustomFieldsParam],
  output: [
    { key: "id", type: "string", label: "User id" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "status", type: "string", label: "Status" },
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
      query: { load_custom_fields: input.loadCustomFields },
    });
  },
};

export default userGet;
