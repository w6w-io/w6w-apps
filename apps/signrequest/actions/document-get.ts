import type { ActionDefinition } from "@w6w/types";
import { SignRequestClient } from "../lib/client.ts";
import { documentIdParam, documentSummaryOutput } from "../lib/params.ts";

interface Input {
  documentId: string;
}

/**
 * `GET /documents/{uuid}/` — a document's metadata, plus its nested `signrequest` and
 * `signing_log` objects once one has been sent. `output` names only the summary fields a workflow
 * typically reads — the full object is returned at runtime.
 */
const documentGet: ActionDefinition<Input> = {
  key: "document-get",
  type: "read",
  resource: "document",
  title: "Get Document",
  description: "Retrieve a document's metadata, SignRequest status and signing log.",
  params: [documentIdParam],
  output: documentSummaryOutput,

  execute(input, ctx) {
    return new SignRequestClient(ctx).request(
      `/documents/${encodeURIComponent(input.documentId)}/`,
    );
  },
};

export default documentGet;
