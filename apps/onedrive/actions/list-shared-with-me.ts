import type { ActionDefinition } from "@w6w/types";
import { GraphClient, type PagedResult } from "../lib/client.ts";
import { listOutput } from "../lib/params.ts";

interface Input {
  allowExternal?: boolean;
  nextLink?: string;
  all?: boolean;
  maxPages?: number;
}

interface DriveItem {
  id?: string;
  name?: string;
  remoteItem?: Record<string, unknown>;
  [k: string]: unknown;
}

/**
 * `GET /me/drive/sharedWithMe`
 *
 * https://learn.microsoft.com/en-us/graph/api/drive-sharedwithme
 *
 * Three things separate this from every other listing here:
 *
 *  - **`/me` only.** The reference documents exactly one form. There is no
 *    `/drives/{id}/sharedWithMe` in v1.0, so this action takes no *Drive ID*.
 *  - **Cross-tenant shares are hidden by default.** "By default, this method
 *    returns items shared within your own tenant. To include items shared from
 *    external tenants, append `?allowexternal=true`". The parameter is spelled
 *    all-lowercase, unlike the OData options elsewhere.
 *  - **The results live in someone else's drive.** Each entry carries a
 *    `remoteItem` facet holding the real `parentReference.driveId` and item id.
 *    Those are the values to feed the other actions — the top-level `id` is a
 *    shortcut in *your* drive, and addressing the file with it does not work
 *    everywhere.
 *
 * Least privileged delegated permission: `Files.Read.All` — this is the one call
 * in the App that `Files.ReadWrite` alone cannot make, and the reason the auth
 * method also requests `Files.ReadWrite.All`. Not supported for application
 * (app-only) permissions at all.
 */
const listSharedWithMe: ActionDefinition<Input, PagedResult<DriveItem>> = {
  key: "list-shared-with-me",
  type: "read",
  resource: "item",
  title: "List Shared With Me",
  description:
    "List the files and folders other people have shared with the signed-in user. Read the `remoteItem` facet for the drive id and item id that address the original.",
  params: [
    {
      key: "allowExternal",
      label: "Include external tenants",
      type: "boolean",
      default: false,
      hint:
        "Adds `?allowexternal=true`. Without it the response covers only items shared from inside your own tenant.",
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

  execute(input, ctx): Promise<PagedResult<DriveItem>> {
    const client = new GraphClient(ctx);
    const options = {
      // Spelled exactly as the reference does — lowercase, and not an OData
      // `$`-prefixed option.
      query: { allowexternal: input.allowExternal ? "true" : undefined },
    };
    const target = input.nextLink ?? "/me/drive/sharedWithMe";
    const opts = input.nextLink ? {} : options;

    return input.all
      ? client.collect<DriveItem>(target, opts, input.maxPages ?? 10)
      : client.page<DriveItem>(target, opts);
  },
};

export default listSharedWithMe;
