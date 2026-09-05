import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `POST /inboxes/{inboxId}/upload-sync` — upload a document and wait (up to
 * ~60 seconds) for the parsed result in the same response.
 *
 * If parsing has not finished when the wait times out, Airparser still
 * answers `200` with `parsing_in_progress: true` and the new `doc_id`, but
 * every other field is `null` — the result then has to be fetched later with
 * `document-get`. That "timeout" response is NOT an error on the wire (it is
 * still HTTP 200), so a workflow must branch on `parsingInProgress`, not on
 * failure.
 *
 * ZIP files are **not** accepted here — use `document-parse-async` for a ZIP.
 * Max file size is 20 MB either way.
 *
 * If the inbox has no extraction schema yet, Airparser generates one
 * automatically from this document's content before parsing it.
 */
interface Input {
  inboxId: string;
  file: unknown;
  meta?: Record<string, unknown>;
}

interface Output {
  doc_id: string;
  parsing_in_progress: boolean;
  status: string | null;
  name: string | null;
  content_type: string | null;
  created_at: string | null;
  processed_at: string | null;
  json: Record<string, unknown> | null;
}

const documentParseSync: ActionDefinition<Input, Output> = {
  key: "document-parse-sync",
  type: "perform",
  resource: "document",
  title: "Parse Document (Sync)",
  description:
    "Upload a document and wait for parsing to finish, returning the extracted JSON in the same " +
    "call. Waits up to ~60 seconds; if parsing is still running, returns parsing_in_progress: " +
    "true instead of an error. ZIP files are not supported here — use the async upload for those.",
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
      hint:
        "EML, PDF, HTML, TXT, MD, DOCX, XLSX, CSV, JPG, PNG or BMP. Max 20MB. No ZIP in sync mode.",
    },
    {
      key: "meta",
      label: "Meta",
      type: "json",
      hint: "Optional custom payload. Included in the parsed JSON under the __meta__ field.",
    },
  ],
  output: [
    { key: "doc_id", type: "string", label: "Document ID" },
    { key: "parsing_in_progress", type: "boolean", label: "Still parsing (timed out waiting)" },
    { key: "status", type: "string", label: "Status" },
    { key: "name", type: "string", label: "File name" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "processed_at", type: "string", label: "Processed at" },
    { key: "json", type: "object", label: "Extracted data" },
  ],

  async execute(input, ctx) {
    const form = new FormData();
    // `input.file` arrives as whatever the host's `file` param resolves to
    // (a Blob/File in the reference runtime); FormData accepts it directly.
    form.append("file", input.file as Blob);
    if (input.meta !== undefined) form.append("meta", JSON.stringify(input.meta));

    return await new AirparserClient(ctx).request<Output>(
      `/inboxes/${encodeURIComponent(input.inboxId)}/upload-sync`,
      { method: "POST", form },
    );
  },
};

export default documentParseSync;
