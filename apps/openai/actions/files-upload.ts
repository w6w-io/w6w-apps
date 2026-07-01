import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, OpenAIClient } from "../lib/client.ts";

interface Input {
  file: string;
  purpose: string;
  fileName?: string;
  fileMimeType?: string;
}

const filesUpload: ActionDefinition<Input> = {
  key: "files-upload",
  type: "perform",
  resource: "file",
  title: "Upload File",
  description: "Upload a file for use with the API (fine-tuning, assistants, batch, ...).",
  params: [
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file contents.",
    },
    {
      key: "purpose",
      label: "Purpose",
      type: "select",
      required: true,
      options: [
        { value: "fine-tune", label: "Fine-tune" },
        { value: "assistants", label: "Assistants" },
        { value: "batch", label: "Batch" },
        { value: "vision", label: "Vision" },
      ],
    },
    { key: "fileName", label: "File name", type: "string", default: "file.jsonl" },
    {
      key: "fileMimeType",
      label: "File MIME type",
      type: "string",
      default: "application/octet-stream",
    },
  ],

  async execute(input, ctx) {
    const client = new OpenAIClient(ctx);
    const form = new FormData();
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], {
        type: input.fileMimeType ?? "application/octet-stream",
      }),
      input.fileName ?? "file.jsonl",
    );
    form.append("purpose", input.purpose);

    return client.request("/files", { method: "POST", form });
  },
};

export default filesUpload;
