import type { ActionDefinition } from "@w6w/types";
import { eq, joinFilters, KeapClient, nextPageToken, V2 } from "../lib/client.ts";
import { filterParam, orderByParam, pageParams } from "../lib/params.ts";

/**
 * `GET /rest/v2/opportunities` — List Opportunities.
 *
 * ## `fields` here is an allowlist, and half of it is conditional
 *
 * Unlike the free-form `fields` on contacts, this one has a closed enum split
 * into two halves, and the second half only works on some accounts. Keap:
 * "Legacy field names are supported for optional fields only if legacy
 * opportunities feature is enabled. Allowed optional values: `custom_fields`,
 * `created_by`, `last_updated_by`, `status_id`. Allowed legacy optional values:
 * `monthly_revenue`, `order_revenue`, `objection`, `status`,
 * `stage_entrance_time`."
 *
 * So asking for `status` succeeds on a legacy account and is rejected on a
 * modern one. The select below marks which is which rather than presenting nine
 * equal options.
 *
 * ## `order_by` uses `created_time`, and nothing else here does
 *
 * The sort field is `created_time`; the response property is `created_time`
 * too — but every other v2 resource in this app spells it `create_time`. Sorting
 * opportunities by `create_time` silently does nothing.
 */
interface Input {
  stageId?: string;
  userId?: string;
  contactId?: string;
  title?: string;
  filter?: string;
  orderBy?: string;
  fields?: string[];
  pageSize?: number;
  pageToken?: string;
}

const opportunityList: ActionDefinition<Input> = {
  key: "opportunity-list",
  type: "search",
  title: "List Opportunities",
  resource: "opportunity",
  description: "Search opportunities by stage, owner, contact or title.",
  params: [
    { key: "stageId", label: "Stage ID", type: "string" },
    { key: "userId", label: "Owner user ID", type: "string" },
    { key: "contactId", label: "Contact ID", type: "string" },
    {
      key: "title",
      label: "Title starts with",
      type: "string",
      hint: "Supports a trailing `*` for prefix matching.",
    },
    filterParam,
    orderByParam(
      "One of `next_action_time`, `contact_name`, `opportunity_title`, `created_time`, " +
        "`update_time`, plus `asc` or `desc`. Note `created_time`, not `create_time`.",
    ),
    {
      key: "fields",
      label: "Optional properties",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "custom_fields", label: "custom_fields" },
        { value: "created_by", label: "created_by" },
        { value: "last_updated_by", label: "last_updated_by" },
        { value: "status_id", label: "status_id" },
        { value: "monthly_revenue", label: "monthly_revenue (legacy accounts only)" },
        { value: "order_revenue", label: "order_revenue (legacy accounts only)" },
        { value: "objection", label: "objection (legacy accounts only)" },
        { value: "status", label: "status (legacy accounts only)" },
        { value: "stage_entrance_time", label: "stage_entrance_time (legacy accounts only)" },
      ],
      hint: "The legacy-marked values are accepted only where Keap's legacy opportunities " +
        "feature is enabled; elsewhere they are rejected.",
    },
    ...pageParams(),
  ],
  output: [
    { key: "opportunities", type: "array", label: "Opportunities" },
    { key: "count", type: "number", label: "Opportunities returned" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const filter = joinFilters([
      eq("stage_id", input.stageId),
      eq("user_id", input.userId),
      eq("contact_id", input.contactId),
      eq("opportunity_title", input.title),
      input.filter,
    ]);
    const fields = Array.isArray(input.fields) ? input.fields.join(",") : input.fields;

    const client = new KeapClient(ctx);
    const body = await client.json<{ opportunities?: unknown[]; next_page_token?: string }>(
      `${V2}/opportunities`,
      {
        query: {
          filter,
          order_by: input.orderBy,
          // Comma-delimited per the parameter's own description, unlike
          // `update_mask` — see `QueryValue` in lib/client.ts.
          fields,
          page_size: input.pageSize,
          page_token: input.pageToken,
        },
      },
    );
    const opportunities = body?.opportunities ?? [];
    return {
      opportunities,
      count: opportunities.length,
      nextPageToken: nextPageToken(body),
    };
  },
};

export default opportunityList;
