import type { ActionDefinition } from "@w6w/types";
import { GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, itemParams } from "../lib/params.ts";

interface Input {
  driveId?: string;
  itemId?: string;
  itemPath?: string;
}

interface DriveItem {
  id?: string;
  name?: string;
  size?: number;
  file?: { mimeType?: string };
  folder?: unknown;
  "@microsoft.graph.downloadUrl"?: string;
}

/**
 * Get a file's pre-authenticated download URL.
 *
 * https://learn.microsoft.com/en-us/graph/api/driveitem-get-content
 *
 * **This returns a URL, not the bytes, and that is a deliberate choice.**
 * `GET /me/drive/items/{id}/content` answers `302 Found` and redirects to a
 * pre-authenticated URL on the tenant's *storage* host — `…sharepoint.com`,
 * `…files.1drv.com` and friends. Those hostnames are per-tenant and cannot be
 * enumerated in `w6w.network.allow`, so following the redirect would mean
 * widening this App's egress to a wildcard for every download. The reference
 * offers the alternative in the same breath: the redirect target "is the same
 * URL available through the `@microsoft.graph.downloadUrl` property on the
 * driveItem", so this action reads the property off a plain metadata `GET` — an
 * ordinary call to `graph.microsoft.com`, the only host this App declares.
 *
 * The request deliberately sends **no `$select`**: `@microsoft.graph.downloadUrl`
 * is an instance annotation on the default representation, and a `$select` that
 * forgets to name it silently drops the one field this action exists for.
 *
 * Two properties of the URL that matter downstream:
 *
 *  - It is **short-lived** — the driveItem reference says it is invalidated
 *    after about an hour — so it is fetched per run and never cached.
 *  - It needs **no `Authorization` header**. It is a bearer capability in its
 *    own right: anyone holding the string can read the file until it expires.
 *    Treat it like a secret, and prefer passing it to the next step over
 *    logging it.
 *
 * Least privileged delegated permission: `Files.Read`.
 */
const getDownloadUrl: ActionDefinition<Input> = {
  key: "get-download-url",
  type: "read",
  resource: "item",
  title: "Get File Download URL",
  description:
    "Return a short-lived, pre-authenticated download URL for a file, plus its name, size and MIME type. Returns the URL rather than the bytes — see the README.",
  params: [driveIdParam, ...itemParams()],
  output: [
    { key: "id", type: "string", label: "Item ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "size", type: "number", label: "Size (bytes)" },
    { key: "mimeType", type: "string", label: "MIME type" },
    { key: "downloadUrl", type: "string", label: "Download URL" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    const item = await client.request<DriveItem>(requireItemPath(input));
    const downloadUrl = item?.["@microsoft.graph.downloadUrl"];
    if (!downloadUrl) {
      // A folder has no content, and that is the overwhelmingly likely cause.
      throw new Error(
        item?.folder
          ? `\`${item.name ?? "item"}\` is a folder — only files have a download URL.`
          : `Microsoft Graph returned no @microsoft.graph.downloadUrl for \`${
            item?.name ?? "item"
          }\`.`,
      );
    }
    return {
      id: item.id,
      name: item.name,
      size: item.size,
      mimeType: item.file?.mimeType,
      downloadUrl,
    };
  },
};

export default getDownloadUrl;
