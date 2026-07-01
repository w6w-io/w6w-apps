import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, FOLDER_MIME, GoogleDriveClient } from "../lib/client.ts";

interface Input {
  /** Parent folder to list children of. Defaults to root. */
  parentFolderId?: string;
  driveId?: string;
  nameContains?: string;
  includeTrashed?: boolean;
  pageSize?: number;
  pageToken?: string;
  fields?: string;
}

/**
 * List folders (one page). Restricts to `mimeType = folder`; add
 * `parentFolderId` to walk a subtree.
 */
const listFolders: ActionDefinition<Input> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: "List folders (one page).",
  params: [
    { key: "parentFolderId", label: "Parent Folder ID", type: "string" },
    { key: "driveId", label: "Drive ID", type: "string" },
    { key: "nameContains", label: "Name contains", type: "string" },
    { key: "includeTrashed", label: "Include trashed", type: "boolean", default: false },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "fields", label: "Fields", type: "string", default: "nextPageToken, files(*)" },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const clauses = [`mimeType = '${FOLDER_MIME}'`];
    if (input.parentFolderId) clauses.push(`'${input.parentFolderId}' in parents`);
    if (input.nameContains) {
      // Escape single quotes in the query fragment.
      const safe = input.nameContains.replace(/'/g, "\\'");
      clauses.push(`name contains '${safe}'`);
    }
    if (!input.includeTrashed) clauses.push("trashed = false");

    const query: Record<string, string | number | boolean | undefined> = {
      q: clauses.join(" and "),
      pageSize: input.pageSize ?? 100,
      pageToken: input.pageToken,
      fields: input.fields ?? "nextPageToken, files(*)",
      ...ALL_DRIVES_QS,
      spaces: "drive",
    };
    if (input.driveId) {
      query.driveId = input.driveId;
      query.corpora = "drive";
    } else {
      query.corpora = "user";
    }
    return client.request("/files", { query });
  },
};

export default listFolders;
