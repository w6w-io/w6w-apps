import type { ActionDefinition } from "@w6w/types";
import { ALL_DRIVES_QS, GoogleDriveClient } from "../lib/client.ts";

interface Input {
  fileId: string;
  fields?: string;
}

const getFile: ActionDefinition<Input> = {
  key: "file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieve a file's metadata by ID.",
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint: "Comma-separated `fields` mask. Defaults to `*` (all fields).",
      default: "*",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDriveClient(ctx);
    return client.request(`/files/${input.fileId}`, {
      query: { fields: input.fields ?? "*", ...ALL_DRIVES_QS },
    });
  },
};

export default getFile;
