import type { ActionDefinition } from "@w6w/types";
import { GroqClient } from "../lib/client.ts";

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
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "bytes", type: "number", label: "Size (bytes)" },
    { key: "filename", type: "string", label: "File name" },
    { key: "purpose", type: "string", label: "Purpose" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    return client.request(`/files/${encodeURIComponent(input.fileId)}`);
  },
};

export default filesRetrieve;
