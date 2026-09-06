import type { ActionDefinition } from "@w6w/types";
import { encodeBusinessId, yelpRequest } from "../lib/client.ts";

interface Input {
  businessId: string;
  limit?: number;
  afterLeadId?: string;
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * `GET /v3/businesses/{business_id}/lead_ids` — the Lead IDs a business has
 * received, newest addressing scheme first: `limit` (1-20, default 20) plus
 * `after_lead_id` for offset pagination, and `created_after`/`created_before`
 * (ISO 8601 with timezone, e.g. `2024-06-30T23:59:59Z`) to scope by creation
 * time. Per the OpenAPI description, time filters apply first and
 * `after_lead_id` then paginates *within* that filtered window.
 *
 * `has_more` in the response tells the caller whether another page exists —
 * feed the last returned lead id back in as `after_lead_id` to continue.
 */
const getLeadIdsForBusiness: ActionDefinition<Input> = {
  key: "get-lead-ids-for-business",
  type: "search",
  resource: "lead",
  title: "Get Lead IDs for a Business",
  description: "List the Lead IDs a Yelp business has received, optionally filtered by time.",
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      hint: "Maximum number of lead IDs to return. 1-20, default 20.",
      validation: { min: 1, max: 20, integer: true },
    },
    {
      key: "afterLeadId",
      label: "After lead ID",
      type: "string",
      hint: "Only return lead IDs that come after this one, for pagination.",
    },
    {
      key: "createdAfter",
      label: "Created at or after",
      type: "string",
      hint: "ISO 8601 with timezone, e.g. 2024-06-30T23:59:59Z. Inclusive.",
    },
    {
      key: "createdBefore",
      label: "Created at or before",
      type: "string",
      hint: "ISO 8601 with timezone, e.g. 2024-06-30T23:59:59Z. Inclusive.",
    },
  ],
  output: [
    { key: "lead_ids", type: "array", label: "Lead IDs" },
    { key: "has_more", type: "boolean", label: "Whether another page exists" },
  ],

  execute(input, ctx) {
    return yelpRequest(ctx, `/businesses/${encodeBusinessId(input.businessId)}/lead_ids`, {
      query: {
        limit: input.limit,
        after_lead_id: input.afterLeadId,
        created_after: input.createdAfter,
        created_before: input.createdBefore,
      },
    });
  },
};

export default getLeadIdsForBusiness;
