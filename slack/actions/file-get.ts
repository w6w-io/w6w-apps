import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

const fileGet: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieves file information (files.info).",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ file?: unknown }>("/files.info", {
      query: { file: input.fileId },
    });
    return res.file ?? res;
  },
};

export default fileGet;
