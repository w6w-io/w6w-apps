import type { ActionDefinition } from "@w6w/types";
import { OpenAIClient } from "../lib/client.ts";

interface Input {
  fileId: string;
}

const filesDelete: ActionDefinition<Input> = {
  key: "files-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete an uploaded file.",
  idempotent: true,
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    return client.request(`/files/${input.fileId}`, { method: "DELETE" });
  },
};

export default filesDelete;
