import type { ActionDefinition } from "@w6w/types";
import { HubstaffClient } from "../lib/client.ts";
import { paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/organizations` — the organizations this credential is an active
 * member of.
 *
 * Returns `{"organizations": [{...Organization}]}`, plus the cursor envelope
 * described in `lib/client.ts`. That is why this app's every other action takes
 * an `organization_id`: an Organization access token reaches exactly the
 * organizations its assigned member belongs to, and this is the only call that
 * discovers them.
 *
 * Each row carries `member_profile_fields` — the organization's custom member
 * field schema, which is what `key` values a workflow may use on
 * `member-list`'s profiles must come from. There is no endpoint that returns
 * them on their own.
 */
interface Input {
  page_start_id?: number;
  page_limit?: number;
}

const action: ActionDefinition<Input> = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List Organizations",
  description:
    "List the organizations the connected member is an active member of (GET /v2/organizations).",
  params: paginationParams(),
  output: [
    { key: "organizations", type: "array", label: "Organizations" },
    { key: "pagination", type: "object", label: "Cursor (next_page_start_id)" },
  ],

  execute(input, ctx) {
    return new HubstaffClient(ctx).request("/organizations", {
      query: {
        page_start_id: input.page_start_id,
        page_limit: input.page_limit,
      },
    });
  },
};

export default action;
