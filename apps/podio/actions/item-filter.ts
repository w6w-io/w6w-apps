import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, encodeSegment, PodioClient, stripSecretsAll } from "../lib/client.ts";
import { appIdParam, pagingParams } from "../lib/params.ts";

/**
 * `POST /item/app/{app_id}/filter/` — "Filters the items and returns the
 * matching items."
 *
 * The list-items call. Podio has no plain `GET /item/app/{id}/`; listing is a
 * POST with a filter body, which is why this is the workhorse read of the app.
 *
 * ## Text fields cannot be filtered here
 *
 * From the Views area, verbatim: "Beware that not all field types can be used
 * for filtering. Most notably **text fields cannot be used for filtering**. You
 * can use the Search interface when working with text filtering." A filter on a
 * text field is not rejected — it simply does not constrain the result, so the
 * workflow gets every item and believes it got a match. Use Search in App for
 * anything text-shaped.
 *
 * The filterable types and their value grammars, from the same page:
 * `state` / `category` take a list of option ids (`null` matches "not set");
 * `number`, `money`, `calculation`, `progress` and `duration` take
 * `{from, to}`; `app` takes a list of item ids; `contact` takes a list of
 * profile ids; `date` takes a range or one of Podio's relative expressions.
 * Built-in keys (`created_on`, `created_by`, `last_edit_on`, `external_id`,
 * `item_id`, `app_item_id`, `title`, `tags`) sit in the same object as the
 * numeric field ids.
 *
 * ## `remember` is not exposed
 *
 * Podio's `remember` flag persists the filter as the user's "last used view".
 * A workflow's filter is not a human's browsing state, and writing to it would
 * change what that person sees next time they open the app in Podio. It is
 * omitted, so Podio's documented default (`false`) applies.
 *
 * `limit` defaults to 30 on Podio's side; the same 30 is prefilled here so the
 * form states the number rather than hiding it.
 */
interface Input {
  appId: string;
  filters?: unknown;
  sortBy?: string;
  sortDesc?: boolean;
  limit?: number;
  offset?: number;
}

const itemFilter: ActionDefinition<Input> = {
  key: "item-filter",
  type: "search",
  resource: "item",
  title: "Filter Items",
  description: "List the items of an app, optionally narrowed by field filters and sorted. Podio " +
    "cannot filter text fields here — use Search in App for text.",
  params: [
    appIdParam,
    {
      key: "filters",
      label: "Filters",
      type: "json",
      placeholder: '{"876": [1, 2], "created_on": {"from": "2026-01-01", "to": "2026-12-31"}}',
      hint: "An object keyed by field id, field external_id, or a built-in key (created_on, " +
        "created_by, last_edit_on, external_id, item_id, app_item_id, title, tags). " +
        "Category and state take a list of option ids; number/money/progress/duration " +
        "take {from, to}. Text fields cannot be filtered — use Search in App.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "A field id, or one of Podio's built-ins: created_on, created_by, last_edit_on, " +
        "last_edit_by, item_id, app_item_id, activity, priority, title, like, approved, " +
        "rsvp, fivestar, yesno, thumbs.",
    },
    { key: "sortDesc", label: "Sort descending", type: "boolean" },
    ...pagingParams(30, "Podio's own default is 30."),
  ],
  output: [
    { key: "items", type: "array", label: "Items" },
    { key: "total", type: "number", label: "Total items in the app" },
    { key: "filtered", type: "number", label: "Items matching the filter" },
  ],

  async execute(input, ctx) {
    const filters = asOptionalJson<Record<string, unknown>>(input.filters, "Filters");
    const body: Record<string, unknown> = {};
    if (filters !== undefined) body.filters = filters;
    if (input.sortBy) body.sort_by = input.sortBy;
    if (input.sortDesc !== undefined) body.sort_desc = input.sortDesc;
    if (input.limit !== undefined) body.limit = input.limit;
    if (input.offset !== undefined) body.offset = input.offset;

    const page = await new PodioClient(ctx).json<
      { total?: number; filtered?: number; items?: unknown[] }
    >(`/item/app/${encodeSegment(input.appId)}/filter/`, { method: "POST", body });

    return {
      items: stripSecretsAll(page?.items ?? []),
      total: page?.total ?? 0,
      filtered: page?.filtered ?? 0,
    };
  },
};

export default itemFilter;
