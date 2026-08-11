import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

interface Input {
  select?: string[];
  orderby?: string;
  top?: number;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface Drive {
  id?: string;
  name?: string;
  driveType?: string;
  [k: string]: unknown;
}

/**
 * `GET /me/drives`
 *
 * https://learn.microsoft.com/en-us/graph/api/drive-list
 *
 * Discovery: every other action takes an optional *Drive ID*, and this is where
 * that id comes from. A personal Microsoft account has exactly one drive here; a
 * work or school account sees its own OneDrive plus any SharePoint document
 * library it has been given access to, distinguishable by `driveType`
 * (`personal`, `business`, `documentLibrary`).
 *
 * The reference documents `$expand`, `$select`, `$skipToken`, `$top` and
 * `$orderby` for this collection — note there is no `$filter`, so filtering by
 * `driveType` has to happen downstream.
 *
 * Least privileged delegated permission: `Files.Read`; this App's
 * `Files.ReadWrite` covers it.
 */
const listDrives: ActionDefinition<Input, PagedResult<Drive>> = {
  key: "list-drives",
  type: "read",
  resource: "drive",
  title: "List Drives",
  description:
    "List the drives the signed-in user can reach — their own OneDrive plus any SharePoint document libraries — and return the ids the other actions address.",
  params: [
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select`, e.g. `id`, `name`, `driveType`, `owner`, `quota`.",
    },
    {
      key: "orderby",
      label: "Order by",
      type: "string",
      advanced: true,
      hint: "OData `$orderby`, e.g. `name asc`.",
    },
    {
      key: "top",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 999 },
      hint: "OData `$top` — results per request.",
    },
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint:
        "The `@odata.nextLink` URL from a previous run. Continues where that run stopped; other query params are ignored because the link already carries them.",
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

  execute(input, ctx): Promise<PagedResult<Drive>> {
    const client = new GraphClient(ctx);
    const options = {
      query: {
        $select: odataList(input.select),
        $orderby: input.orderby,
        $top: input.top,
      },
    };
    // A nextLink already encodes every query parameter from the original call,
    // so it is replayed verbatim rather than re-decorated.
    const target = input.nextLink ?? "/me/drives";
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect<Drive>(target, opts, input.maxPages ?? 10)
      : client.page<Drive>(target, opts);
  },
};

export default listDrives;
