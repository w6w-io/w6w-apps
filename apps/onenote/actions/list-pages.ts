import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, pagesPath } from "../lib/client.ts";
import { listOutput, locationParams, pagingParams, selectParams } from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  sectionId?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface Page {
  id?: string;
  title?: string;
  [k: string]: unknown;
}

/**
 * `GET .../onenote/pages` (flat, across the whole location) ·
 * `GET .../onenote/sections/{id}/pages`
 *
 * https://learn.microsoft.com/en-us/graph/api/onenote-list-pages
 * https://learn.microsoft.com/en-us/graph/api/section-list-pages
 *
 * The default query for the flat form returns the top 20 pages ordered by
 * `lastModifiedDateTime desc`; the maximum `$top` for either form is 100. The
 * default response expands `parentSection` and selects its `id`,
 * `displayName` and `self`. Valid `$expand` values are `parentNotebook` and
 * `parentSection`.
 *
 * Least privileged delegated permission: `Notes.Read`. This App requests the
 * broader `Notes.ReadWrite` (needed by its other, write, actions). Supported
 * for both work-or-school and personal Microsoft accounts.
 */
const listPages: ActionDefinition<Input, PagedResult<Page>> = {
  key: "list-pages",
  type: "read",
  resource: "page",
  title: "List Pages",
  description:
    "List OneNote pages — under a specific section, or flat across the whole location (most recently modified first).",
  params: [
    ...locationParams(),
    {
      key: "sectionId",
      label: "Section ID",
      type: "string",
      hint: "List pages in this section only. Leave empty to list every page in the location.",
    },
    ...selectParams("OData `$expand`, e.g. `parentNotebook`, `parentSection`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Page>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
    };
    const target = input.nextLink ?? pagesPath(input);
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<Page>(target, opts, input.maxPages ?? 10)
      : await client.page<Page>(target, opts);
  },
};

export default listPages;
