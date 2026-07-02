import type { ActionDefinition } from "@w6w/types";
import { DropboxClient } from "../lib/client.ts";

interface Input {
  fromPath: string;
  toPath: string;
  autorename?: boolean;
}

const copyFile: ActionDefinition<Input> = {
  key: "copy-file",
  type: "perform",
  resource: "file",
  title: "Copy File",
  description: "Copy a file to a new path.",
  params: [
    { key: "fromPath", label: "From Path", type: "string", required: true },
    { key: "toPath", label: "To Path", type: "string", required: true },
    { key: "autorename", label: "Auto-rename on conflict", type: "boolean", default: false },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    return client.request("/files/copy_v2", {
      body: {
        from_path: input.fromPath,
        to_path: input.toPath,
        autorename: input.autorename ?? false,
      },
    });
  },
};

export default copyFile;
