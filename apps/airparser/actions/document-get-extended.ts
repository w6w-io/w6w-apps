import type { ActionDefinition } from "@w6w/types";
import { AirparserClient } from "../lib/client.ts";

/**
 * `GET /docs/{documentId}/extended` — a richer read than `document-get`,
 * adding fields like the inbox/owner ids, raw extracted text, page count and
 * a preview image, plus sibling-document navigation (`prevId`/`nextId`).
 *
 * `source=parsed` forces the response to the original AI output instead of
 * any post-processing script's result — useful for debugging a
 * post-processing step against what the model actually returned.
 *
 * **A caution, not a redaction.** The docs list a `secret` field among this
 * endpoint's "typical response fields" with no further explanation of what it
 * is for. Unlike Apify's `proxy.password` / `urlSigningSecretKey` — which
 * this pack's `apps/apify` strips because their purpose and blast radius are
 * independently documented — nothing in Airparser's docs says what `secret`
 * grants, so it is passed through unaltered rather than guessed at and
 * silently dropped. Treat a document's extended read as data that may carry
 * a token-shaped field until Airparser's docs say otherwise.
 */
interface Input {
  documentId: string;
  source?: string;
}

const documentGetExtended: ActionDefinition<Input, Record<string, unknown>> = {
  key: "document-get-extended",
  type: "read",
  resource: "document",
  title: "Get Document (Extended)",
  description:
    "Get a document's extended details: inbox/owner ids, raw text, format, a preview, page count, " +
    "and prev/next document ids, in addition to the fields Get Document returns. See the action's " +
    "own description for a caution about the undocumented `secret` field this endpoint returns.",
  params: [
    {
      key: "documentId",
      label: "Document ID",
      type: "string",
      required: true,
      hint: "The doc_id / _id returned by an upload or by List Documents.",
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: [{ value: "parsed", label: "Original parsed output (skip post-processing)" }],
      hint: "Leave empty for the normal (possibly post-processed) result.",
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Document ID" },
    { key: "inbox_id", type: "string", label: "Inbox ID" },
    { key: "owner_id", type: "string", label: "Owner ID" },
    { key: "name", type: "string", label: "File name" },
    { key: "data_text", type: "string", label: "Raw extracted text" },
    { key: "format", type: "string", label: "Document format" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "processed_at", type: "string", label: "Processed at" },
    { key: "filename", type: "string", label: "File name" },
    { key: "content_type", type: "string", label: "Content type" },
    { key: "credits", type: "number", label: "Credits consumed" },
    { key: "img_preview", type: "string", label: "Preview image URL" },
    { key: "pages", type: "number", label: "Page count" },
    { key: "json", type: "object", label: "Extracted data" },
    { key: "prevId", type: "string", label: "Previous document ID in the inbox" },
    { key: "nextId", type: "string", label: "Next document ID in the inbox" },
  ],

  execute(input, ctx) {
    return new AirparserClient(ctx).request<Record<string, unknown>>(
      `/docs/${encodeURIComponent(input.documentId)}/extended`,
      { query: { source: input.source } },
    );
  },
};

export default documentGetExtended;
