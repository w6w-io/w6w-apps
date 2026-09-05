import type { ActionDefinition } from "@w6w/types";
import { compactQuery, FormidableClient } from "../lib/client.ts";

interface Input {
  formId?: string | number;
  date?: string;
  search?: string;
  sort?: string;
  isDraft?: boolean;
}

/**
 * `GET /frm/v3/entries` or `GET /frm/v3/forms/{form_id}/entries` — search
 * entries.
 *
 * The reference names exactly these list inputs for entries: `form_id, date,
 * search, sort, is_draft, and pagination filters` — the pagination filter
 * names themselves are not given (unlike the Forms/Styles routes, which
 * spell out `page`/`page_size`), so this action does not guess at them and
 * leaves paging to whatever the response itself returns. When a Form ID is
 * given, the form-scoped route is used and doubles as the `form_id` filter;
 * otherwise `/entries` is called directly. Permission: "View Entries from
 * Admin Area". `is_draft` filters to entries saved as a draft rather than
 * submitted.
 */
const entryGetMany: ActionDefinition<Input> = {
  key: "entry-get-many",
  type: "search",
  resource: "entry",
  title: "Get Many Entries",
  description: "Search entries across the site or within one form.",
  params: [
    {
      key: "formId",
      label: "Form ID or Key",
      type: "string",
      hint: "Restrict to one form (uses the form-scoped route). Leave empty to search across " +
        "every form.",
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint: "Filter by the entry's created date, in the format this site's `date` filter accepts.",
    },
    { key: "search", label: "Search", type: "string" },
    { key: "sort", label: "Sort", type: "string" },
    {
      key: "isDraft",
      label: "Drafts Only",
      type: "boolean",
      hint: "Sent as `is_draft`. Filters to entries saved as a draft rather than submitted.",
    },
  ],

  execute(input, ctx) {
    const client = FormidableClient.fromConnection(ctx);
    const scoped = input.formId !== undefined && input.formId !== null && input.formId !== "";
    const path = scoped ? `/forms/${encodeURIComponent(String(input.formId))}/entries` : "/entries";

    return client.request(path, {
      query: compactQuery({
        date: input.date,
        search: input.search,
        sort: input.sort,
        is_draft: input.isDraft,
      }),
    });
  },
};

export default entryGetMany;
