import type { ActionDefinition } from "@w6w/types";
import { VideoAskClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `GET /search/forms` — search form titles by keyword within the organization.
 *
 * Confirmed `{count, next, previous, facets, results}` envelope — one field
 * more than the plain forms list (`facets`, empty in every captured example).
 * Note the vendor's own doc: results are "listed in chronological order;
 * oldest forms will appear at the top" — the opposite order of `GET /forms`.
 * Each result item is a lighter-weight search hit
 * (`id`, not `form_id`; `created_at`, `deleted_at`, `folder_id`,
 * `organization_id`, `thumbnail`, `title`, `highlight`), not the full form
 * entity — call Get Form to expand it.
 */
interface Input {
  search: string;
  limit?: number;
  organizationId?: string;
}

const formSearch: ActionDefinition<Input> = {
  key: "form-search",
  type: "search",
  resource: "form",
  title: "Search Forms",
  description: "Search form titles by keyword. Results are oldest-first, unlike List Forms.",
  params: [
    { key: "search", label: "Search term", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 20,
      validation: { integer: true, min: 0 },
      hint: "How many matching forms to return.",
    },
    organizationIdParam,
  ],
  output: [
    { key: "count", type: "number", label: "Total match count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Matching forms (search-hit shape, not full forms)" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).list("/search/forms", {
      query: { search: input.search, limit: input.limit },
      organizationId: input.organizationId,
    });
  },
};

export default formSearch;
