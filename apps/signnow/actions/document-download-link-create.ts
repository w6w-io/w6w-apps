import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `POST /document/{document_id}/download/link` — returns a one-time-use URL
 * anyone can use to download the document as a PDF, no SignNow login needed.
 */
const documentDownloadLinkCreate: ActionDefinition<Input> = {
  key: "document-download-link-create",
  type: "perform",
  resource: "document",
  title: "Create Download Link",
  description: "Create a one-time-use public download link for a document (PDF).",
  idempotent: false,
  params: [documentIdParam],
  output: [{ key: "link", type: "string", label: "One-time download URL" }],

  execute(input, ctx) {
    return new SignNowClient(ctx).request(
      `/document/${encodeURIComponent(input.documentId)}/download/link`,
      { method: "POST" },
    );
  },
};

export default documentDownloadLinkCreate;
