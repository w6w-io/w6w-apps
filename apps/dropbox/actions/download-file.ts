import type { ActionDefinition } from "@w6w/types";
import { CONTENT_URL, DropboxClient } from "../lib/client.ts";

interface Input {
  path: string;
  /** When true (default) decode the response body as UTF-8 text. */
  asText?: boolean;
}

/**
 * Download a file from Dropbox. Dropbox returns the raw bytes in the response
 * body and the file metadata JSON in the `Dropbox-API-Result` header. This
 * action returns both — `content` as either a UTF-8 string (default) or a
 * base64 string, and `metadata` parsed from the header.
 */

/** base64 encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

const downloadFile: ActionDefinition<Input> = {
  key: "download-file",
  type: "read",
  resource: "file",
  title: "Download File",
  description: "Download a file's contents from Dropbox.",
  params: [
    { key: "path", label: "File Path", type: "string", required: true },
    {
      key: "asText",
      label: "Return as UTF-8 text",
      type: "boolean",
      default: true,
      hint: "When off, the file is base64-encoded so binary content survives JSON serialization.",
    },
  ],
  output: [
    { key: "content", type: "string", label: "File contents" },
    { key: "encoding", type: "string", label: "Encoding (utf-8 or base64)" },
    { key: "metadata", type: "object", label: "Dropbox metadata" },
  ],

  async execute(input, ctx) {
    const client = new DropboxClient(ctx);
    const res = await client.request<Response>(`${CONTENT_URL}/files/download`, {
      dropboxApiArg: { path: input.path },
      raw: true,
    });
    const metaHeader = res.headers.get("Dropbox-API-Result") ??
      res.headers.get("dropbox-api-result");
    const metadata = metaHeader ? JSON.parse(metaHeader) : null;

    const asText = input.asText ?? true;
    if (asText) {
      const content = await res.text();
      return { content, encoding: "utf-8", metadata };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return { content: encodeBase64(buf), encoding: "base64", metadata };
  },
};

export default downloadFile;
