import type { QueryValue } from "./client.ts";
import { dateFilter, idList } from "./client.ts";

/**
 * The filter shape every Harvest v3 list endpoint shares, and the one place it
 * is turned into query parameters.
 *
 * Greenhouse's list endpoints are unusually uniform — `cursor`, `per_page`,
 * `ids`, `created_at`, `updated_at` and `fields` appear on all of them with
 * identical semantics — so the shared half is built once here and each Action
 * adds only its own resource-specific filters. That is not just brevity: the
 * cursor-exclusivity rule and the `gte|<timestamp>` encoding are both easy to
 * get subtly wrong, and there is exactly one implementation of each to get right.
 */
export interface BaseListInput {
  cursor?: string;
  perPage?: number;
  ids?: string;
  createdAtOperator?: string;
  createdAt?: string;
  updatedAtOperator?: string;
  updatedAt?: string;
  fields?: string;
}

/**
 * Build the shared query parameters. Absent values are dropped by
 * `buildListQuery`, which the caller applies together with its own filters.
 */
export function baseListQuery(input: BaseListInput): Record<string, QueryValue> {
  return {
    per_page: input.perPage,
    ids: idList(input.ids, "ids"),
    created_at: dateFilter(input.createdAtOperator, input.createdAt),
    updated_at: dateFilter(input.updatedAtOperator, input.updatedAt),
    fields: input.fields,
  };
}
