import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type TaskMutateResponse } from "../lib/client.ts";

interface Input {
  fileId: string;
}

/**
 * `POST /v2/file.delete` — delete a file early. Files are auto-deleted 48
 * hours after upload regardless, so this is only needed for early cleanup.
 *
 * `idempotent: true`: the end state after one call and after five is the
 * same file gone.
 */
const fileDelete: ActionDefinition<Input, TaskMutateResponse> = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete File",
  description: "Delete a file before its automatic 48-hour expiration.",
  idempotent: true,
  params: [
    { key: "fileId", label: "File ID", type: "string", required: true },
  ],
  output: [],

  execute(input, ctx) {
    return new ManusClient(ctx).request<TaskMutateResponse>("/v2/file.delete", {
      method: "POST",
      body: { file_id: input.fileId },
    });
  },
};

export default fileDelete;
