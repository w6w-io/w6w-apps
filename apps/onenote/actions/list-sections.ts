import type { ActionDefinition } from "@w6w/types";
import { containerBase, GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import {
  containerParams,
  listOutput,
  locationParams,
  pagingParams,
  selectParams,
} from "../lib/params.ts";

interface Input {
  location?: string;
  locationId?: string;
  notebookId?: string;
  sectionGroupId?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface Section {
  id?: string;
  displayName?: string;
  [k: string]: unknown;
}

/**
 * `GET .../onenote/sections` (flat) · `GET .../onenote/notebooks/{id}/sections` ·
 * `GET .../onenote/sectionGroups/{id}/sections`
 *
 * https://learn.microsoft.com/en-us/graph/api/onenote-list-sections
 * https://learn.microsoft.com/en-us/graph/api/notebook-list-sections
 * https://learn.microsoft.com/en-us/graph/api/sectiongroup-list-sections
 *
 * Default sort order is `name asc`; the default query expands `parentNotebook`
 * and selects its `id`, `displayName` and `self`. Valid `$expand` values are
 * `parentNotebook` and `parentSectionGroup`.
 *
 * Least privileged delegated permission: `Notes.Create` (restricted to
 * app-created content — see `auth/oauth2.ts`); this App requests the broader
 * `Notes.ReadWrite`. Supported for both work-or-school and personal Microsoft
 * accounts.
 */
const listSections: ActionDefinition<Input, PagedResult<Section>> = {
  key: "list-sections",
  type: "read",
  resource: "section",
  title: "List Sections",
  description:
    "List OneNote sections — under a specific notebook or section group, or flat across the whole location.",
  params: [
    ...locationParams(),
    ...containerParams(),
    ...selectParams("OData `$expand`, e.g. `parentNotebook`, `parentSectionGroup`."),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Section>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
    };
    const target = input.nextLink ?? containerBase(input, "sections");
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<Section>(target, opts, input.maxPages ?? 10)
      : await client.page<Section>(target, opts);
  },
};

export default listSections;
