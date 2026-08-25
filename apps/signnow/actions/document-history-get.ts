import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `GET /document/{document_id}/historyfull` — the document's audit trail.
 * SignNow returns a bare JSON array of event objects (`event`, `email`,
 * `created`, `ip_address`, `client_app_name`, …), not a wrapped object.
 */
const documentHistoryGet: ActionDefinition<Input> = {
  key: "document-history-get",
  type: "read",
  resource: "document",
  title: "Get Document History",
  description: "Retrieve the full audit trail of events for a document.",
  params: [documentIdParam],
  output: [
    {
      key: "[]",
      type: "array",
      label: "History events — a bare array of `{event, email, created, ...}`",
    },
  ],

  execute(input, ctx) {
    return new SignNowClient(ctx).request(
      `/document/${encodeURIComponent(input.documentId)}/historyfull`,
    );
  },
};

export default documentHistoryGet;
