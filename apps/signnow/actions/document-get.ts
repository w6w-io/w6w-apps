import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";
import { documentIdParam, documentSummaryOutput } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `GET /document/{document_id}` — the full document resource: metadata,
 * fields, signatures, roles, field invites, routing details.
 *
 * The real response is large and deeply nested (SignNow's own example runs to
 * dozens of fields covering the document editor's internal state), so
 * `output` only names the summary fields a workflow typically reads — the
 * full object is still returned at runtime, `output` just documents a subset.
 */
const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Retrieve a document's metadata, fields, signatures and roles.",
  params: [documentIdParam],
  output: documentSummaryOutput,

  execute(input, ctx) {
    return new SignNowClient(ctx).request(`/document/${encodeURIComponent(input.documentId)}`);
  },
};

export default documentGet;
