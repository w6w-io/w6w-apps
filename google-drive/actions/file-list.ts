import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, GoogleDriveClient } from "../lib/client.ts";

interface Input {
  /** Google Drive query string, e.g. `mimeType != 'application/vnd.google-apps.folder'`. */
  q?: string;
  pageSize?: number;
  pageToken?: string;
  fields?: string;
  driveId?: string;
  includeTrashed?: boolean;
}

/**
 * List files/folders. Mirrors the n8n v2 "File/Folder → Search" operation, but
 * exposed as a straight files.list — one page at a time (pass back `pageToken`).
 */
const listFiles: ActionDefinition<Input> = {
  key: "file-list",
  type: "search",
  resource: "file",
  title: "List Files",
  description: "List files (one page). Use `q` for Google Drive search syntax.",
  params: [
    { key: "q", label: "Query", type: "string", hint: "Google Drive `q` search syntax." },
    { key: "pageSize", label: "Page size", type: "number", default: 100 },
    { key: "pageToken", label: "Page token", type: "string" },
    { key: "fields", label: "Fields", type: "string", default: "nextPageToken, files(*)" },
    { key: "driveId", label: "Drive ID", type: "string" },
    { key: "includeTrashed", label: "Include trashed", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    const clauses = [];
    if (input.q) clauses.push(input.q);
    if (!input.includeTrashed) clauses.push("trashed = false");
    const query: Record<string, string | number | boolean | undefined> = {
      q: clauses.length ? clauses.join(" and ") : undefined,
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

export default listFiles;
