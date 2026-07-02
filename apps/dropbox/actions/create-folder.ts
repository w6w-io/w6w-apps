import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  path: string;
  autorename?: boolean;
}

const createFolder: ActionDefinition<Input> = {
  key: "create-folder",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a folder at the given path. Parent folder must exist.",
  params: [
    {
      key: "path",
      label: "Folder Path",
      type: "string",
      required: true,
      hint: "Full path in Dropbox, e.g. /invoices/2026.",
    },
    { key: "autorename", label: "Auto-rename on conflict", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request("/files/create_folder_v2", {
      body: {
        path: input.path,
        autorename: input.autorename ?? false,
      },
    });
  },
};

export default createFolder;
