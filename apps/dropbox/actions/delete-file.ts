import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  path: string;
}

/**
 * Deletes a file at the given path. Dropbox's delete_v2 endpoint accepts
 * either a file or a folder, but we split them into two actions so the editor
 * can group them by resource.
 */
const deleteFile: ActionDefinition<Input> = {
  key: "delete-file",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete a file at the given path.",
  params: [
    { key: "path", label: "File Path", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request("/files/delete_v2", {
      body: { path: input.path },
    });
  },
};

export default deleteFile;
