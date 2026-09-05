import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `POST /inboxes/{inboxId}/upload` — upload a document and return
 * immediately; parsing happens in the background. Fetch the result later
 * with `document-get`, or receive it via a configured webhook/Zapier/
 * Make/n8n/Google Sheets integration.
 *
 * Unlike the sync upload, ZIP files ARE accepted here (the vendor's stated
 * difference between the two endpoints). Max file size is still 20 MB.
 *
 * **Response shape caveat.** The docs state only "Returns: document ID." for
 * this endpoint, without showing a sample body — unlike the sync upload,
 * whose full response is shown. This app returns the parsed JSON body
 * verbatim rather than assuming a specific field name for it, since the one
 * field name that IS confirmed elsewhere in the docs (`doc_id`, on the sync
 * upload and on `document-get`) is a reasonable guess here but was not
 * observed on this exact endpoint.
 */
interface Input {
  inboxId: string;
  file: unknown;
  meta?: Record<string, unknown>;
}

const documentParseAsync: ActionDefinition<Input, Record<string, unknown>> = {
  key: "document-parse-async",
  type: "perform",
  resource: "document",
  title: "Parse Document (Async)",
  description: "Upload a document and return immediately with a document ID; parsing runs in the " +
    "background. Supports ZIP files, unlike the sync upload. Fetch the result later with " +
    "Get Document, or via a configured webhook/Zapier/Make/n8n integration.",
  idempotent: false,
  params: [
    {
      key: "inboxId",
      label: "Inbox",
      type: "string",
      required: true,
      hint: "Found in the inbox's URL in the Airparser app.",
    },
    {
      key: "file",
      label: "File",
      type: "file",
      required: true,
      hint: "EML, PDF, HTML, TXT, MD, DOCX, XLSX, CSV, JPG, PNG, BMP, or a ZIP of these. Max 20MB.",
    },
    {
      key: "meta",
      label: "Meta",
      type: "json",
      hint: "Optional custom payload. Included in the parsed JSON under the __meta__ field.",
    },
  ],
  output: [
    {
      key: "doc_id",
      type: "string",
      label: "Document ID (field name inferred — see the action's description)",
    },
  ],

  async execute(input, ctx) {
    const form = new FormData();
    form.append("file", input.file as Blob);
    if (input.meta !== undefined) form.append("meta", JSON.stringify(input.meta));

    return await new AirparserClient(ctx).request<Record<string, unknown>>(
      `/inboxes/${encodeURIComponent(input.inboxId)}/upload`,
      { method: "POST", form },
    );
  },
};

export default documentParseAsync;
