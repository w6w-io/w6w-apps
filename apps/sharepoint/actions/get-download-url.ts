import type { ActionDefinition } from "@w6w/types";
import { GraphClient, requireItemPath } from "../lib/client.ts";
import { driveIdParam, itemParams, siteParams } from "../lib/params.ts";

interface Input {
  siteId?: string;
  hostname?: string;
  path?: string;
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
 * `GET {drive}/items/{id}/content` answers `302 Found` and redirects to a
 * pre-authenticated URL on the tenant's own SharePoint storage host, which is
 * per-tenant and cannot be enumerated in `w6w.network.allow`. The reference
 * offers the alternative in the same breath: the redirect target "is the same
 * URL available through the `@microsoft.graph.downloadUrl` property on the
 * driveItem", so this action reads the property off a plain metadata `GET` —
 * an ordinary call to `graph.microsoft.com`, the only host this App declares.
 *
 * The request deliberately sends **no `$select`**: `@microsoft.graph.downloadUrl`
 * is an instance annotation on the default representation, and a `$select`
 * that forgets to name it silently drops the one field this action exists
 * for.
 *
 * The URL is **short-lived** (roughly an hour, per the reference) and needs
 * **no `Authorization` header** — it is a bearer capability in its own right.
 * Treat it like a secret; hand it to the next step rather than logging it.
 *
 * Least privileged delegated permission: `Files.Read`; `Sites.Read.All` is
 * documented as a valid higher alternative and is the one this App requests.
 */
const getDownloadUrl: ActionDefinition<Input> = {
  key: "get-download-url",
  type: "read",
  resource: "drive-item",
  title: "Get File Download URL",
  description:
    "Return a short-lived, pre-authenticated download URL for a file, plus its name, size and MIME type.",
  params: [...siteParams(), driveIdParam, ...itemParams()],
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
