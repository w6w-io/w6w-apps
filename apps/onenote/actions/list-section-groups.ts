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
  onenoteOnly?: boolean;
  select?: string[];
  expand?: string[];
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface SectionGroup {
  id?: string;
  displayName?: string;
  [k: string]: unknown;
}

/**
 * `GET .../onenote/sectionGroups` (flat) · `GET .../onenote/notebooks/{id}/sectionGroups` ·
 * `GET .../onenote/sectionGroups/{id}/sectionGroups`
 *
 * https://learn.microsoft.com/en-us/graph/api/onenote-list-sectiongroups
 * https://learn.microsoft.com/en-us/graph/api/notebook-list-sectiongroups
 * https://learn.microsoft.com/en-us/graph/api/sectiongroup-list-sectiongroups
 *
 * Default sort order is `name asc`. Valid `$expand` values are `sections`,
 * `sectionGroups`, `parentNotebook` and `parentSectionGroup`.
 *
 * The reference calls out a SharePoint-specific quirk on the flat, `sites`-
 * rooted form: "A section group in SharePoint is a folder object" — listing
 * section groups at a site lists every subfolder in the site's root pages
 * folder, OneNote-owned or not. Filtering that down to real OneNote section
 * groups needs `$filter=parentNotebook ne null`, which this action exposes as
 * the "OneNote only" option below rather than always appending it, since the
 * flat form is also used for `me`/`users`/`groups`, where the filter is a
 * no-op and unnecessary $filter usage is worth avoiding on Graph.
 *
 * Least privileged delegated permission: `Notes.Create` (restricted to
 * app-created content — see `auth/oauth2.ts`); this App requests the broader
 * `Notes.ReadWrite`. Supported for both work-or-school and personal Microsoft
 * accounts.
 */
const listSectionGroups: ActionDefinition<Input, PagedResult<SectionGroup>> = {
  key: "list-section-groups",
  type: "read",
  resource: "section-group",
  title: "List Section Groups",
  description:
    "List OneNote section groups — under a specific notebook or section group, or flat across the whole location.",
  params: [
    ...locationParams(),
    ...containerParams(),
    {
      key: "onenoteOnly",
      label: "OneNote section groups only",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "On a SharePoint site, a section group is really a folder object — the flat listing includes every subfolder in the site's pages folder, not just OneNote's. Adds `$filter=parentNotebook ne null` to exclude non-OneNote folders. Only meaningful for the flat, site-rooted form.",
    },
    ...selectParams(
      "OData `$expand`, e.g. `sections`, `sectionGroups`, `parentNotebook`, `parentSectionGroup`.",
    ),
    ...pagingParams(),
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<SectionGroup>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
        $filter: input.onenoteOnly ? "parentNotebook ne null" : undefined,
      },
    };
    const target = input.nextLink ?? containerBase(input, "sectionGroups");
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<SectionGroup>(target, opts, input.maxPages ?? 10)
      : await client.page<SectionGroup>(target, opts);
  },
};

export default listSectionGroups;
