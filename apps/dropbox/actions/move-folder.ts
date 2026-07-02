import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  fromPath: string;
  toPath: string;
  autorename?: boolean;
}

const moveFolder: ActionDefinition<Input> = {
  key: "move-folder",
  type: "perform",
  resource: "folder",
  title: "Move Folder",
  description: "Move (or rename) a folder to a new path.",
  params: [
    { key: "fromPath", label: "From Path", type: "string", required: true },
    { key: "toPath", label: "To Path", type: "string", required: true },
    { key: "autorename", label: "Auto-rename on conflict", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request("/files/move_v2", {
      body: {
        from_path: input.fromPath,
        to_path: input.toPath,
        autorename: input.autorename ?? false,
      },
    });
  },
};

export default moveFolder;
