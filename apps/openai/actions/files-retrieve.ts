import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

const filesRetrieve: ActionDefinition<Input> = {
  key: "files-retrieve",
  type: "read",
  resource: "file",
  title: "Retrieve File",
  description: "Retrieve metadata for a single uploaded file.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    return client.request(`/files/${input.fileId}`);
  },
};

export default filesRetrieve;
