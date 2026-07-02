import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  path: string;
  includeMediaInfo?: boolean;
  includeDeleted?: boolean;
  includeHasExplicitSharedMembers?: boolean;
}

/**
 * Fetch metadata for a file or folder. Dropbox returns a tagged union with
 * `.tag` set to `file`, `folder`, or `deleted`.
 */
const getFileMetadata: ActionDefinition<Input> = {
  key: "get-file-metadata",
  type: "read",
  resource: "file",
  title: "Get File Metadata",
  description: "Retrieve metadata for a file or folder at the given path.",
  params: [
    { key: "path", label: "Path", type: "string", required: true },
    { key: "includeMediaInfo", label: "Include media info", type: "boolean", default: false },
    { key: "includeDeleted", label: "Include deleted entries", type: "boolean", default: false },
    {
      key: "includeHasExplicitSharedMembers",
      label: "Include has_explicit_shared_members",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request("/files/get_metadata", {
      body: {
        path: input.path,
        include_media_info: input.includeMediaInfo ?? false,
        include_deleted: input.includeDeleted ?? false,
        include_has_explicit_shared_members: input.includeHasExplicitSharedMembers ?? false,
      },
    });
  },
};

export default getFileMetadata;
