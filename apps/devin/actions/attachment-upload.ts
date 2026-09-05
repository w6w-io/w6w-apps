import type { ActionDefinition } from "@w6w/types";
import { API_BASE, orgIdFromConnection } from "../lib/client.ts";

interface AttachmentResponse {
  attachment_id: string;
  name: string;
  url: string;
}

/**
 * `POST /v3/organizations/{org_id}/attachments` — upload a file so it can be
 * referenced (by the URL this returns) from `session-create`'s
 * `attachmentUrls` or `session-message-send`'s `attachmentUrls`.
 *
 * `multipart/form-data` with a single `file` field, per the vendor's own
 * schema — built here directly with `FormData` rather than through
 * `DevinClient.org`, since every other call in this app sends JSON.
 */
interface Input {
  file: unknown;
}

const attachmentUpload: ActionDefinition<Input, AttachmentResponse> = {
  key: "attachment-upload",
  type: "perform",
  resource: "attachment",
  title: "Upload Attachment",
  description: "Upload a file attachment for use in a Devin session or message.",
  idempotent: false,
  params: [
    { key: "file", label: "File", type: "file", required: true },
  ],
  output: [
    { key: "attachment_id", type: "string", label: "Attachment ID" },
    { key: "name", type: "string", label: "File name" },
    {
      key: "url",
      type: "string",
      label: "URL — pass into a session's or message's Attachment URLs",
    },
  ],

  async execute(input, ctx) {
    const orgId = orgIdFromConnection(ctx.connection);
    const form = new FormData();
    // `input.file` arrives as whatever the host's `file` param resolves to
    // (a Blob/File in the reference runtime); FormData accepts it directly.
    form.append("file", input.file as Blob);

    const res = await ctx.fetch(
      `${API_BASE}/v3/organizations/${encodeURIComponent(orgId)}/attachments`,
      { method: "POST", body: form },
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Devin ${res.status} for POST /attachments: ${detail.slice(0, 800)}`);
    }
    return await res.json() as AttachmentResponse;
  },
};

export default attachmentUpload;
