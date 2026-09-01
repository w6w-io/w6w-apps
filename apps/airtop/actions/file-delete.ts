import type { ActionDefinition } from "@w6w/types";
import { AirtopClient } from "../lib/client.ts";

/** `DELETE /v1/files/{id}` — delete a file. No documented response body on success. */
interface Input {
  fileId: string;
}

const fileDelete: ActionDefinition<Input> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete a file.",
  idempotent: true,
  params: [{ key: "fileId", label: "File ID", type: "string", required: true }],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "fileId", type: "string", label: "File ID" },
  ],

  async execute(input, ctx) {
    await new AirtopClient(ctx).status(`/v1/files/${encodeURIComponent(input.fileId)}`, {
      method: "DELETE",
    });
    return { success: true, fileId: input.fileId };
  },
};

export default fileDelete;
