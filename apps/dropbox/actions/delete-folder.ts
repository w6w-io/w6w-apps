import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  path: string;
}

/**
 * Deletes a folder (and its contents) at the given path. Same underlying
 * endpoint as `delete-file` — split by resource for the editor's grouping.
 */
const deleteFolder: ActionDefinition<Input> = {
  key: "delete-folder",
  type: "perform",
  resource: "folder",
  title: "Delete Folder",
  description: "Delete a folder and its contents.",
  params: [
    { key: "path", label: "Folder Path", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request("/files/delete_v2", {
      body: { path: input.path },
    });
  },
};

export default deleteFolder;
