import type { ActionDefinition } from "@w6w/types";
import {
  type BatchUpdateBody,
  type BatchUpdateRequest,
  extractDocumentId,
  GoogleDocsClient,
} from "../lib/client.ts";

interface Input {
  documentURL: string;
  requests: BatchUpdateRequest[];
  /**
   * `targetRevisionId` or `requiredRevisionId` — matches Google's
   * `WriteControl` shape and n8n's `writeControlObject`.
   */
  writeControl?: { control: "targetRevisionId" | "requiredRevisionId"; value: string };
}

/**
 * Generic escape hatch: pass a raw array of Google Docs `Request` objects
 * straight through to `documents.batchUpdate`. This is the pass-through action
 * for anything the per-verb actions don't cover.
 *
 * Reference: https://developers.google.com/docs/api/reference/rest/v1/documents/request
 */
const documentBatchUpdate: ActionDefinition<Input> = {
  key: "document-batch-update",
  type: "perform",
  resource: "document",
  title: "Batch Update (raw)",
  description:
    "Send an arbitrary array of Google Docs `Request` objects to `documents.batchUpdate`. Use per-verb actions when possible; this is the escape hatch.",
  params: [
    {
      key: "documentURL",
      label: "Document ID or URL",
      type: "string",
      required: true,
    },
    {
      key: "requests",
      label: "Requests (JSON array)",
      type: "json",
      required: true,
      hint:
        "Array of Google Docs `Request` objects, e.g. `[{ \"insertText\": { \"text\": \"hi\", \"endOfSegmentLocation\": {} } }]`.",
    },
    {
      key: "writeControl",
      label: "Write Control (revision)",
      type: "json",
      hint:
        "Optional `{ \"control\": \"requiredRevisionId\", \"value\": \"…\" }` to bind changes to a specific revision.",
    },
  ],

  async execute(input, ctx) {
    const client = new GoogleDocsClient(ctx);
    const documentId = extractDocumentId(input.documentURL);
    const body: BatchUpdateBody = { requests: input.requests };
    if (input.writeControl) {
      body.writeControl = { [input.writeControl.control]: input.writeControl.value };
    }
    return client.request(`/documents/${documentId}:batchUpdate`, { method: "POST", body });
  },
};

export default documentBatchUpdate;
