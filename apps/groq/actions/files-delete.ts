import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

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
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    return client.request(`/files/${encodeURIComponent(input.fileId)}`, { method: "DELETE" });
  },
};

export default filesDelete;
