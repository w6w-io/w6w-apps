import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

const filesList: ActionDefinition<Record<string, never>> = {
  key: "files-list",
  type: "read",
  resource: "file",
  title: "List Files",
  description: "List every file uploaded to the current account.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Files" },
    { key: "object", type: "string", label: "Object type" },
  ],

  execute(_input, ctx) {
    const client = new GroqClient(ctx);
    return client.request("/files");
  },
};

export default filesList;
