import type { Param } from "@w6w/types";
import type { QueryValue } from "./client.ts";

/**
 * Shared `Param` fragments for the Unbounce actions.
 *
 * Every field and default here is copied from the reference's own inline JSON
 * Schema and "Query Parameters" tables (fetched 2026-08-30 from
 * `developer.unbounce.com/api_reference/`), not inferred.
 */

/**
 * The `sort_order` / `count` / `from` / `to` / `offset` / `limit` set every
 * collection endpoint documents identically (accounts' own sub-resources,
 * domains, page groups, pages).
 *
 * `limit` defaults to the vendor's own 50, not widened here — Unbounce's ceiling
 * is a modest 1000, and 50 is a reasonable per-step page size for a workflow
 * rather than a footgun, unlike some vendors that default to their maximum.
 */
export function listParams(): Param[] {
  return [
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      default: "asc",
      options: [
        { value: "asc", label: "Ascending (default)" },
        { value: "desc", label: "Descending" },
      ],
      hint: "Sort by creation date.",
    },
    {
      key: "count",
      label: "Count only",
      type: "boolean",
      hint: "When on, the response omits the collection itself — only metadata.count is returned.",
    },
    {
      key: "from",
      label: "Created after",
      type: "datetime",
      hint: "Limit results to those created after this date-time.",
    },
    {
      key: "to",
      label: "Created before",
      type: "datetime",
      hint: "Limit results to those created before this date-time.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Number of results to skip from the start.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Unbounce's own default is 50; the documented maximum is 1000.",
    },
  ];
}

export interface ListInput {
  sortOrder?: string;
  count?: boolean;
  from?: string;
  to?: string;
  offset?: number;
  limit?: number;
}

/** Build the query object for {@link listParams}. */
export function listQuery(input: ListInput): Record<string, QueryValue> {
  return {
    sort_order: input.sortOrder,
    count: input.count === undefined ? undefined : String(input.count),
    from: input.from,
    to: input.to,
    offset: input.offset,
    limit: input.limit,
  };
}

export const accountIdParam: Param = {
  key: "accountId",
  label: "Account ID",
  type: "string",
  required: true,
  hint: "Numeric account id, e.g. from GET /accounts.",
};

export const subAccountIdParam: Param = {
  key: "subAccountId",
  label: "Sub-Account ID",
  type: "string",
  required: true,
  hint: 'Unbounce calls this a "Client" in the app UI. Numeric id, e.g. from GET ' +
    "/accounts/{account_id}/sub_accounts.",
};

export const domainIdParam: Param = {
  key: "domainId",
  label: "Domain ID",
  type: "string",
  required: true,
  hint: "Numeric custom-domain id, e.g. from GET /sub_accounts/{sub_account_id}/domains.",
};

export const pageGroupIdParam: Param = {
  key: "pageGroupId",
  label: "Page Group ID",
  type: "string",
  required: true,
};

export const pageIdParam: Param = {
  key: "pageId",
  label: "Page ID",
  type: "string",
  required: true,
  hint: "UUID, e.g. from GET /pages.",
};

export const leadIdParam: Param = {
  key: "leadId",
  label: "Lead ID",
  type: "string",
  required: true,
};

export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "string",
  required: true,
};
