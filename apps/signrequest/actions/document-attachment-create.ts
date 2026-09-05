import type { ActionDefinition } from "@w6w/types";
import { compact, resourceUrl, SignRequestClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  name?: string;
  fileFromUrl?: string;
  fileFromContent?: string;
  fileFromContentName?: string;
}

/**
 * `POST /document-attachments/` — attach a file signers can view/download before signing, without
 * it being signed itself.
 *
 * Per SignRequest's docs this only works for a document created via `fileFromUrl`/`fileFromContent`
 * (`document-create`) — a document created from a `templateId` must have its attachments added
 * through the SignRequest UI instead. It also only works before the document's SignRequest has been
 * sent (`signrequest-create` / `signrequest-quick-create`).
 */
const documentAttachmentCreate: ActionDefinition<Input> = {
  key: "document-attachment-create",
  type: "perform",
  resource: "document",
  title: "Add Document Attachment",
  description:
    "Attach a file signers can view/download before signing. Only for a not-yet-sent document " +
    "created via File from URL / File from Content, not one created from a template.",
  idempotent: false,
  params: [
    documentIdParam,
    { key: "name", label: "Name", type: "string", hint: "Defaults to the filename, if known." },
    { key: "fileFromUrl", label: "File from URL", type: "string" },
    { key: "fileFromContent", label: "File from Content (base64)", type: "text" },
    {
      key: "fileFromContentName",
      label: "File from Content — filename",
      type: "string",
      hint: "Including extension. Required when File from Content is used.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Attachment ID" },
    { key: "url", type: "string", label: "Attachment resource URL" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/document-attachments/", {
      method: "POST",
      body: compact({
        document: resourceUrl("documents", input.documentId),
        name: input.name,
        file_from_url: input.fileFromUrl,
        file_from_content: input.fileFromContent,
        file_from_content_name: input.fileFromContentName,
      }),
    });
  },
};

export default documentAttachmentCreate;
