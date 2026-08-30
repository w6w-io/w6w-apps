import type { ActionDefinition } from "@w6w/types";
import { CognitoFormsClient } from "../lib/client.ts";

interface Input {
  formId: string;
  entryId: string;
  fileId: string;
}

/**
 * GET /forms/{formId}/entries/{entryId}/files/{fileId} — a file uploaded to an entry via a File
 * Upload field, returned as JSON with the content base64-encoded in `Content`. Requires
 * `Entry:Read`.
 */
const entryFileGet: ActionDefinition<Input> = {
  key: "entry-file-get",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Retrieve a file that was uploaded to an entry.",
  params: [
    {
      key: "formId",
      label: "Form ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Forms.",
    },
    {
      key: "entryId",
      label: "Entry ID",
      type: "string",
      required: true,
      hint: "Get IDs from a webhook payload, an import result, or another system's own record.",
    },
    {
      key: "fileId",
      label: "File ID",
      type: "string",
      required: true,
      hint: "From the entry's file-upload field value.",
    },
  ],
  output: [
    { key: "Id", type: "string", label: "File ID" },
    { key: "Name", type: "string", label: "File name" },
    { key: "ContentType", type: "string", label: "MIME type" },
    { key: "Size", type: "number", label: "Size in bytes" },
    { key: "File", type: "string", label: "Direct download URL" },
    { key: "Content", type: "string", label: "Base64-encoded file content" },
  ],

  async execute(input, ctx) {
    return await new CognitoFormsClient(ctx).request(
      `/forms/${encodeURIComponent(input.formId)}/entries/${
        encodeURIComponent(input.entryId)
      }/files/${encodeURIComponent(input.fileId)}`,
    );
  },
};

export default entryFileGet;
