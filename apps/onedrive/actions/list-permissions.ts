import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult, requireItemPath } from "../lib/client.ts";
import { driveIdParam, itemParams, listOutput } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
  select?: string[];
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface Permission {
  id?: string;
  roles?: string[];
  inheritedFrom?: Record<string, unknown>;
  link?: Record<string, unknown>;
  grantedToV2?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * `GET /me/drive/items/{item-id}/permissions`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-list-permissions
 *
 * Who can reach this item, and how. The reference makes one distinction that
 * decides whether a permission can be removed at all: effective permissions come
 * either from a grant **on this item** or from one **inherited from an ancestor**,
 * and the two are told apart by the presence of `inheritedFrom` — an itemReference
 * naming the ancestor the grant actually lives on. Delete Permission works only
 * on the former; an inherited grant has to be removed where it was made.
 *
 * `$select` is the only query option documented here.
 *
 * Least privileged delegated permission: `Files.ReadWrite`. This is one of the
 * 5-resource-unit permission calls in SharePoint's throttling model — the same
 * cost as `$expand=permissions`, and 2.5× a folder listing.
 */
const listPermissions: ActionDefinition<Input, PagedResult<Permission>> = {
  key: "list-permissions",
  type: "read",
  resource: "permission",
  title: "List Permissions",
  description:
    "List the sharing permissions on a file or folder. Entries carrying `inheritedFrom` are inherited from an ancestor and cannot be deleted here.",
  params: [
    driveIdParam,
    ...itemParams(),
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint:
        "OData `$select` — the only query option this endpoint documents. e.g. `id`, `roles`, `link`, `grantedToV2`, `inheritedFrom`.",
    },
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint: "The `@odata.nextLink` URL from a previous run. Continues where that run stopped.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Follow `@odata.nextLink` until exhausted or the page cap is reached.",
    },
    {
      key: "maxPages",
      label: "Max pages",
      type: "number",
      default: 10,
      advanced: true,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Upper bound on requests when 'Fetch all pages' is on.",
    },
  ],
  output: listOutput,

  async execute(input, ctx): Promise<PagedResult<Permission>> {
    const client = new GraphClient(ctx);
    const options = { query: { $select: odataList(input.select) } };
    const target = input.nextLink ?? requireItemPath(input, "/permissions");
    const opts = input.nextLink ? {} : options;

    return input.all
      ? await client.collect<Permission>(target, opts, input.maxPages ?? 10)
      : await client.page<Permission>(target, opts);
  },
};

export default listPermissions;
