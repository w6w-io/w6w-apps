import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

interface Input {
  statementId: string;
}

interface Output {
  content: string;
  encoding: "base64";
  contentType: string;
  fileName?: string;
}

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** Mercury's `Content-Disposition` is a standard `attachment; filename="..."` form. */
export function fileNameFrom(disposition: string | null): string | undefined {
  if (!disposition) return undefined;
  const m = /filename\*?=(?:"([^"]*)"|([^;]+))/i.exec(disposition);
  const value = (m?.[1] ?? m?.[2])?.trim();
  return value || undefined;
}

/**
 * `GET /statements/{statementId}/pdf` — `operationId: getStatementPdf`.
 * "Returns binary PDF data" per the vendor's own description, with a
 * `Content-Disposition` header for the file name.
 *
 * ## The response is bytes, not JSON
 *
 * Same reasoning as `docusign`'s `envelope-document-download` in this pack:
 * an Action's return value has to survive JSON serialization across the
 * worker boundary, so the PDF bytes are base64-encoded into a string with
 * the transport content type reported alongside. Fine for a single
 * statement; not a way to move large archives.
 */
const statementPdfGet: ActionDefinition<Input, Output> = {
  key: "statement-pdf-get",
  type: "read",
  resource: "statement",
  title: "Download Statement PDF",
  description: "Download a single account statement as a base64-encoded PDF.",
  params: [
    {
      key: "statementId",
      label: "Statement ID",
      type: "string",
      required: true,
      hint: "A statement UUID — from the account-statement-list action.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "PDF bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type" },
    { key: "fileName", type: "string", label: "File name from Content-Disposition" },
  ],

  async execute(input, ctx) {
    const res = await new MercuryClient(ctx).raw(
      `/statements/${encodeURIComponent(input.statementId)}/pdf`,
    );
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      encoding: "base64",
      contentType: res.headers.get("content-type") ?? "application/pdf",
      fileName: fileNameFrom(res.headers.get("content-disposition")),
    };
  },
};

export default statementPdfGet;
