import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, orgIdFrom, ZohoDeskClient } from "../lib/client.ts";
import { orgId, ticketId } from "../lib/params.ts";

interface Input {
  ticketId: string;
  file: string;
  fileName?: string;
  fileMimeType?: string;
  isPublic?: boolean;
  orgId?: string;
}

/**
 * `POST /tickets/{ticket_id}/attachments` — multipart file upload
 * (`Content-Type: multipart/form-data`, field name `file`). `ctx.fetch`
 * cannot stream a real file from disk inside the sandbox, so the file
 * travels as a base64 string param and is decoded into a `Blob` here, the
 * same pattern this pack's `anthropic` app uses for its own file upload.
 */
const ticketAttachmentCreate: ActionDefinition<Input> = {
  key: "ticket-attachment-create",
  type: "perform",
  resource: "ticket-attachment",
  title: "Create Ticket Attachment",
  description: "Attach a file to a ticket. Max size 20 MB (Zoho returns RESOURCE_SIZE_EXCEEDED).",
  idempotent: false,
  params: [
    ticketId,
    {
      key: "file",
      label: "File (base64)",
      type: "text",
      required: true,
      hint: "Base64-encoded file contents.",
    },
    { key: "fileName", label: "File name", type: "string", default: "upload.bin" },
    {
      key: "fileMimeType",
      label: "File MIME type",
      type: "string",
      default: "application/octet-stream",
    },
    { key: "isPublic", label: "Public", type: "boolean" },
    orgId,
  ],
  output: [{ key: "id", type: "string", label: "Attachment ID" }],

  execute(input, ctx) {
    const form = new FormData();
    form.append(
      "file",
      new Blob([base64ToBytes(input.file)], {
        type: input.fileMimeType ?? "application/octet-stream",
      }),
      input.fileName ?? "upload.bin",
    );

    return new ZohoDeskClient(ctx).request(
      `/tickets/${encodeURIComponent(input.ticketId)}/attachments`,
      {
        method: "POST",
        orgId: orgIdFrom(input, ctx),
        query: { isPublic: input.isPublic },
        form,
      },
    );
  },
};

export default ticketAttachmentCreate;
