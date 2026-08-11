import type { ActionDefinition } from "@w6w/types";
import { drivePath, GraphClient, odataList, type PagedResult } from "../lib/client.ts";
import { deltaOutput, driveIdParam, selectParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  deltaLink?: string;
  token?: string;
  select?: string[];
  expand?: string[];
  top?: number;
  excludeParents?: boolean;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

/**
 * `GET /me/drive/root/delta`
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-delta
 *
 * Change tracking for a whole drive — added, updated **and deleted**, which is
 * the part a `lastModifiedDateTime` poll can never give you: a deleted item
 * simply stops appearing, whereas delta reports it (as an item carrying a
 * `deleted` facet).
 *
 * The round protocol, and the one place OneDrive differs from every other
 * collection in this App:
 *
 *  1. First run — leave *Delta link* empty. Graph enumerates the drive's current
 *     state and hands back `@odata.deltaLink` on the **last** page.
 *  2. Later runs — pass that link back as *Delta link*. Graph returns only what
 *     changed since, and issues a fresh delta link.
 *
 * `@odata.nextLink` and `@odata.deltaLink` are mutually exclusive: while more
 * pages remain you get the former, and the latter appears only when the round
 * closes. Turning on *Fetch all pages* is therefore the normal way to run this —
 * a single page usually returns no delta link at all.
 *
 * `token=latest` is the documented way to say "I don't want the current state,
 * just give me a starting point": it returns an empty response with a delta link.
 *
 * Delta is also the cheapest way to scan a drive. SharePoint's throttling
 * guidance prices a delta request *with* a token at 1 resource unit even though
 * it is a multi-item query — half the cost of the equivalent listing.
 *
 * Least privileged delegated permission: `Files.Read`.
 */
const listChanges: ActionDefinition<Input, PagedResult<Record<string, unknown>>> = {
  key: "list-changes",
  type: "read",
  resource: "item",
  title: "List Changes",
  description:
    "Track additions, updates and deletions across a whole drive using Graph delta query. Deletions appear as items carrying a `deleted` facet.",
  params: [
    driveIdParam,
    {
      key: "deltaLink",
      label: "Delta link",
      type: "string",
      hint:
        "The `@odata.deltaLink` returned by the previous run. Leave empty for the first run, which enumerates the drive's current state and opens the round.",
    },
    {
      key: "token",
      label: "Token",
      type: "string",
      advanced: true,
      placeholder: "latest",
      hint:
        "The `token` function parameter. `latest` returns an empty page plus a delta link — a starting point without reading the whole drive. Ignored when a delta link is supplied.",
    },
    ...selectParams(),
    {
      key: "top",
      label: "Page size",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1, max: 999 },
      hint: "OData `$top` — one of the three query options this function documents.",
    },
    {
      key: "excludeParents",
      label: "Exclude parent items",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Sends the `deltaExcludeParent` header, so the response carries the changed items without their ancestor folders.",
    },
    {
      key: "nextLink",
      label: "Next link",
      type: "string",
      advanced: true,
      hint: "The `@odata.nextLink` from a partially-consumed round. Continues where it stopped.",
    },
    {
      key: "all",
      label: "Fetch all pages",
      type: "boolean",
      default: true,
      advanced: true,
      hint:
        "Follow `@odata.nextLink` to the end of the round. Normally left on: the delta link only appears on the final page.",
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
  output: deltaOutput,

  execute(input, ctx): Promise<PagedResult<Record<string, unknown>>> {
    const client = new GraphClient(ctx);
    const resume = input.nextLink ?? input.deltaLink;
    const target = resume ?? `${drivePath(input.driveId)}/root/delta`;
    const headers = input.excludeParents ? { deltaExcludeParent: "true" } : undefined;
    // A resumed link already carries every parameter from the round that
    // produced it; re-sending them is at best redundant and at worst a 400.
    const opts = resume ? { headers } : {
      query: {
        token: input.token,
        $select: odataList(input.select),
        $expand: odataList(input.expand),
        $top: input.top,
      },
      headers,
    };

    return input.all === false
      ? client.page(target, opts)
      : client.collect(target, opts, input.maxPages ?? 10);
  },
};

export default listChanges;
