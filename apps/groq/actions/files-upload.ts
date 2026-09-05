import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, GroqClient } from "../lib/client.ts";

interface Input {
  file: string;
  fileName?: string;
  fileMimeType?: string;
}

/**
 * POST /files — unlike OpenAI's Files API (fine-tune, assistants, batch,
 * vision, ...), Groq's `purpose` field has exactly ONE legal value: `batch`.
 * Files exist solely to feed the Batch API a JSONL of requests, so there is
 * nothing for a caller to choose — the param is fixed rather than exposed as
 * a dead select with one option.
 */
const filesUpload: ActionDefinition<Input> = {
  key: "files-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a JSONL file of batch requests for use with the Batch API.",
  idempotent: false,
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded JSONL contents, max 100MB.",
    },
    { key: "fileName", label: "File name", type: "string", default: "batch.jsonl" },
    {
      key: "fileMimeType",
      label: "File MIME type",
      type: "string",
      default: "application/jsonl",
    },
  ],
  output: [
    { key: "id", type: "string", label: "File ID" },
    { key: "bytes", type: "number", label: "Size (bytes)" },
    { key: "filename", type: "string", label: "File name" },
  ],

  execute(input, ctx) {
    const client = new GroqClient(ctx);
    const form = new FormData();
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], {
        type: input.fileMimeType ?? "application/jsonl",
      }),
      input.fileName ?? "batch.jsonl",
    );
    form.append("purpose", "batch");

    return client.request("/files", { method: "POST", form });
  },
};

export default filesUpload;
