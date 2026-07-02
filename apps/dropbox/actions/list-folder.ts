import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  path?: string;
  recursive?: boolean;
  includeDeleted?: boolean;
  includeMediaInfo?: boolean;
  includeHasExplicitSharedMembers?: boolean;
  includeMountedFolders?: boolean;
  includeNonDownloadableFiles?: boolean;
  limit?: number;
  cursor?: string;
}

/**
 * List the entries inside a folder. Walks one page; when the response's
 * `has_more` is true, pass the returned `cursor` back through this action's
 * `cursor` input to fetch the next page (Dropbox switches to the
 * `/files/list_folder/continue` endpoint automatically).
 *
 * Passing an empty `path` (or omitting it) lists the root of the Dropbox — the
 * API accepts `""` for that case.
 */
const listFolder: ActionDefinition<Input> = {
  key: "list-folder",
  type: "read",
  resource: "folder",
  title: "List Folder",
  description: "List the files and folders inside a folder.",
  params: [
    { key: "path", label: "Folder Path", type: "string", hint: "Empty string lists the root." },
    { key: "recursive", label: "Recursive", type: "boolean", default: false },
    { key: "includeDeleted", label: "Include deleted", type: "boolean", default: false },
    { key: "includeMediaInfo", label: "Include media info", type: "boolean", default: false },
    {
      key: "includeHasExplicitSharedMembers",
      label: "Include has_explicit_shared_members",
      type: "boolean",
      default: false,
    },
    {
      key: "includeMountedFolders",
      label: "Include mounted folders",
      type: "boolean",
      default: true,
    },
    {
      key: "includeNonDownloadableFiles",
      label: "Include non-downloadable files",
      type: "boolean",
      default: true,
    },
    { key: "limit", label: "Page size", type: "number", default: 100 },
    { key: "cursor", label: "Continuation cursor", type: "string" },
  ],
  output: [
    { key: "entries", type: "array", label: "Entries" },
    { key: "cursor", type: "string", label: "Cursor" },
    { key: "has_more", type: "boolean", label: "Has more" },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    // The continue endpoint accepts *only* the cursor — the initial list_folder
    // endpoint rejects it. Route to whichever applies.
    if (input.cursor) {
      return client.request("/files/list_folder/continue", {
        body: { cursor: input.cursor },
      });
    }
    return client.request("/files/list_folder", {
      body: {
        path: input.path ?? "",
        recursive: input.recursive ?? false,
        include_deleted: input.includeDeleted ?? false,
        include_media_info: input.includeMediaInfo ?? false,
        include_has_explicit_shared_members: input.includeHasExplicitSharedMembers ?? false,
        include_mounted_folders: input.includeMountedFolders ?? true,
        include_non_downloadable_files: input.includeNonDownloadableFiles ?? true,
        limit: input.limit ?? 100,
      },
    });
  },
};

export default listFolder;
