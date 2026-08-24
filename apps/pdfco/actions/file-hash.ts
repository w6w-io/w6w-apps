import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";

/**
 * `POST /v1/file/hash` — despite being titled "Get MD5 Hash of File by URL"
 * in PDF.co's sidebar and OpenAPI summary, the vendor's own worked example
 * returns `"d942e5becdcb0386598cce15e9e56deb1ca9d893b8578a88eca4a62f02c4000b"`
 * — 64 hex characters, the length of a SHA-256 digest, not the 32 an MD5
 * digest would be. This action is titled and described without naming an
 * algorithm the response does not actually match, and does not repeat the
 * vendor's "MD5" claim.
 */
interface Input {
  url: string;
}

interface Output {
  hash?: string;
}

const fileHash: ActionDefinition<Input, Output> = {
  key: "file-hash",
  type: "read",
  title: "Get File Hash",
  description: "Compute a hash of a file at a URL, for verifying it hasn't changed between " +
    "steps. PDF.co's own docs call this an MD5 hash, but its worked example returns a " +
    "64-character (SHA-256-length) digest, not a 32-character MD5 one — treat the algorithm as " +
    "unconfirmed rather than trusting the vendor's own label.",
  params: [{ key: "url", label: "File URL", type: "string", required: true }],
  output: [{ key: "hash", type: "string", label: "Hash of the file" }],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/file/hash", compact({ ...input }));
  },
};

export default fileHash;
