import type { ActionDefinition } from "@w6w/types";
import { SignNowClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  type: "collapsed" | "zip";
  withHistory?: boolean;
}

interface Output {
  content: string;
  encoding: "base64";
  contentType: string;
}

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * `GET /document/{document_id}/download?type=collapsed|zip` — download the
 * document as a PDF (`collapsed`) or a ZIP of the PDF plus attachments
 * (`zip`). `type` is documented `required`.
 *
 * The response is bytes, not JSON, so it is base64-encoded into a string with
 * its transport content type reported alongside — the same shape `docusign`,
 * `pandadoc`, `box` and `dropbox` already use in this pack for a file-shaped
 * response crossing the worker boundary.
 */
const documentDownload: ActionDefinition<Input, Output> = {
  key: "document-download",
  type: "read",
  resource: "document",
  title: "Download Document",
  description: "Download a document as PDF or as a ZIP including attachments, base64-encoded.",
  params: [
    documentIdParam,
    {
      key: "type",
      label: "Format",
      type: "select",
      required: true,
      default: "collapsed",
      options: [
        { value: "collapsed", label: "PDF (collapsed)" },
        { value: "zip", label: "ZIP (PDF + attachments)" },
      ],
    },
    {
      key: "withHistory",
      label: "Include history table",
      type: "boolean",
      default: false,
      hint: "Appends a table of the document's history. Only applies to the collapsed PDF.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "Document bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type (PDF or ZIP)" },
  ],

  async execute(input, ctx) {
    const res = await new SignNowClient(ctx).request<Response>(
      `/document/${encodeURIComponent(input.documentId)}/download`,
      {
        raw: true,
        headers: { accept: "*/*" },
        query: {
          type: input.type,
          with_history: input.withHistory ? "1" : undefined,
        },
      },
    );
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      encoding: "base64",
      contentType: res.headers.get("content-type") ??
        (input.type === "zip" ? "application/zip" : "application/pdf"),
    };
  },
};

export default documentDownload;
