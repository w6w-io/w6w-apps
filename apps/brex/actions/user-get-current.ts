import type { ActionDefinition } from "@w6w/types";
import { BrexClient, type BrexUser, CURRENT_USER_PATH } from "../lib/client.ts";
import { loadCustomFieldsParam } from "../lib/params.ts";

/**
 * `GET /v2/users/me` — the user the token belongs to.
 *
 * The same call the credential probe makes, and deliberately so: this endpoint
 * needs no scope beyond holding a token, answer nothing secret, and describes
 * whose account every other action here is operating on. The path comes from
 * `lib/client.ts`'s `CURRENT_USER_PATH` and the query from the shared
 * `queryString()`, so the action and the auth hooks cannot drift onto different
 * resources.
 *
 * The one difference between the two call sites is who stamps the credential:
 * `auth/api-token.ts` holds it and signs the request itself, while this action
 * sends no auth header at all — the runtime routes it through the `sign` hook.
 */
interface Input {
  loadCustomFields?: boolean;
}

const userGetCurrent: ActionDefinition<Input> = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description:
    "Fetch the Brex user the connection's token belongs to. Also the connection's liveness probe.",
  params: [loadCustomFieldsParam],
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
    { key: "remote_display_id", type: "string", label: "Identifier shown by the IDP or HR system" },
    { key: "metadata", type: "object", label: "Metadata" },
    { key: "custom_fields", type: "array", label: "Custom field values, when requested" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexUser>(CURRENT_USER_PATH, {
      query: { load_custom_fields: input.loadCustomFields },
    });
  },
};

export default userGetCurrent;
