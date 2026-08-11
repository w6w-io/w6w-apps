import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeSegment, PodioClient } from "../lib/client.ts";
import { appIdParam } from "../lib/params.ts";

/**
 * `GET /item/app/{app_id}/count` — "Returns the number of items on app matching
 * a given saved view or set of filter(s)."
 *
 * The one Podio endpoint that answers "how many?" without paging through
 * everything, and the only reliable way to size a job before running it.
 *
 * ## Filters go in the query string, not the body
 *
 * Unlike Filter Items — which is a POST with a JSON `filters` object — this is
 * a GET whose filters are *ad-hoc query keys*, one per field id, with the value
 * spelled as a delimited string. From Podio's own example: "get all items with
 * a state field either not set or set to `active` would look like
 * `/item/app/123/?876=null;active`, with 123 being the id of the app and 876
 * the id of the state field." Lists are semicolon-separated, ranges are
 * `from-to`.
 *
 * So the `filters` parameter here is a flat JSON object of query keys, and the
 * values are already-formatted strings — not the nested structure Filter Items
 * takes. The two are genuinely different grammars for the same idea, which is
 * why this action does not try to share one.
 */
interface Input {
  appId: string;
  viewId?: string;
  filters?: unknown;
}

const itemCount: ActionDefinition<Input> = {
  key: "item-count",
  type: "read",
  resource: "item",
  title: "Count Items",
  description:
    "How many items in an app match a saved view or a set of filters, without fetching " +
    "them. Filters here are query-string style, not the nested form Filter Items takes.",
  params: [
    appIdParam,
    {
      key: "viewId",
      label: "View ID",
      type: "string",
      hint: "Apply a saved view. Podio documents 0 as “the last used view”.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      placeholder: '{"876": "null;active", "created_on": "2026-01-01-2026-12-31"}',
      hint: "A flat object of query keys to already-formatted values. Keys are field ids or " +
        "the built-ins (created_on, created_by, tags, title, …). Lists are " +
        "semicolon-separated (“1;2”), ranges are “from-to”.",
    },
  ],
  output: [{ key: "count", type: "number", label: "Matching items" }],

  async execute(input, ctx) {
    const filters = asOptionalJson<Record<string, unknown>>(input.filters, "Filters") ?? {};
    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(compact(filters))) query[k] = String(v);
    if (input.viewId) query.view_id = String(input.viewId);

    const body = await new PodioClient(ctx).json<{ count?: number }>(
      `/item/app/${encodeSegment(input.appId)}/count`,
      { query },
    );
    return { count: body?.count ?? 0 };
  },
};

export default itemCount;
