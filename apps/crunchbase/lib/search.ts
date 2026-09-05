import type { Param } from "@w6w/types";
import { compact, csv, jsonArray } from "./client.ts";

/**
 * Shared shape of every `/data/searches/{collection}` request body — verified
 * against `EntitySearch` / `<Collection>EntitySearch` in Crunchbase's OpenAPI
 * document. `field_ids` and `query` are both **required**; `query` takes up
 * to 25 predicate objects (`{ type: "predicate", field_id, operator_id,
 * values }`), and pagination is keyset-based (`after_id`/`before_id`, the
 * uuid of the last/first row on the current page), not offset-based.
 *
 * `query` and `order` are exposed as raw JSON rather than a fixed set of form
 * fields: Crunchbase's own field/operator vocabulary is too large to model as
 * form controls (93 organization fields alone, 20 operators — see
 * `OperatorEnum` and `OrganizationFieldId` in the schema) without losing what
 * makes the search API useful. This mirrors how the `algolia` app exposes
 * `extraParams` for the same reason.
 *
 * One documented surprise worth knowing before writing a predicate:
 * **money-typed fields take an object, not a number.** Crunchbase's own
 * pagination example (`docs/paginating-through-the-search-api`) queries
 * `money_raised` with `{"value": 10000000, "currency": "usd"}` inside
 * `values`, even though the schema's `Predicate.values` items are typed as
 * `anyOf[string, number, boolean]` — the schema under-describes its own API.
 */
export const SEARCH_BODY_PARAMS: Param[] = [
  {
    key: "fieldIds",
    label: "Fields To Return",
    type: "string",
    required: true,
    hint: "Comma-separated field_ids to include as columns in the result.",
  },
  {
    key: "query",
    label: "Query",
    type: "json",
    required: true,
    hint: 'Array of predicate objects, e.g. [{"type":"predicate","field_id":"name","operator_id":' +
      '"contains","values":["acme"]}]. Up to 25. A money field (funding_total, money_raised, ' +
      'valuation, …) takes {"value": <number>, "currency": "usd"} in "values", not a bare number.',
  },
  {
    key: "order",
    label: "Order",
    type: "json",
    default: "",
    hint: 'Array of {"field_id","sort":"asc"|"desc","nulls"?}. Optional.',
  },
  {
    key: "limit",
    label: "Limit",
    type: "number",
    default: 100,
    hint: "Rows per page. Default 100, min 1, max 1000.",
  },
  {
    key: "afterId",
    label: "After (uuid)",
    type: "string",
    default: "",
    hint: "Paginate forward: the uuid of the last row on the current page. Not with beforeId.",
  },
  {
    key: "beforeId",
    label: "Before (uuid)",
    type: "string",
    default: "",
    hint: "Paginate backward: the uuid of the first row on the current page. Not with afterId.",
  },
];

/** Build the shared `/data/searches/{collection}` request body from form input. */
export function buildSearchBody(input: Record<string, unknown>): Record<string, unknown> {
  const fieldIds = csv(input.fieldIds);
  if (!fieldIds) throw new Error("`fieldIds` is required");
  const query = jsonArray(input.query, "query");
  if (!query) throw new Error("`query` is required");

  return compact({
    field_ids: fieldIds,
    query,
    order: jsonArray(input.order, "order"),
    limit: typeof input.limit === "number" ? input.limit : undefined,
    after_id: input.afterId,
    before_id: input.beforeId,
  });
}

/** Search-result output shape shared by every `/data/searches/{collection}` endpoint. */
export const SEARCH_OUTPUT = [
  { key: "count", type: "number" as const, label: "Total matching entities" },
  { key: "entities", type: "array" as const, label: "Entities" },
];
