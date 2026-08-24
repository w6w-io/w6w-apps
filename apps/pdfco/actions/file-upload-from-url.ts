import type { ActionDefinition } from "@w6w/types";
import { compact, PdfCoClient } from "../lib/client.ts";
import { httpAuthParams, nameParam } from "../lib/params.ts";

/**
 * `POST /v1/file/upload/url` — fetch a file from a URL and re-host it in
 * PDF.co's temporary storage, returning a new URL other PDF.co actions can
 * use. Useful when a source is only reachable with credentials this app
 * shouldn't repeat on every call, or to pin a moving/expiring source URL
 * before a longer async pipeline runs.
 *
 * The raw multipart `POST /v1/file/upload` (local file path) and
 * `POST /v1/file/upload/base64` variants are not implemented: neither the
 * sandbox nor a typical workflow step has a local file path or an
 * already-base64-encoded blob to hand it, so a URL-to-URL rehost is this
 * app's one file-hosting primitive.
 */
interface Input {
  url: string;
  name?: string;
  httpusername?: string;
  httppassword?: string;
}

interface Output {
  url?: string;
  name?: string;
}

const fileUploadFromUrl: ActionDefinition<Input, Output> = {
  key: "file-upload-from-url",
  type: "perform",
  title: "Upload File from URL",
  description: "Fetch a file from a URL and copy it into PDF.co's temporary storage, returning " +
    "a new URL other PDF.co actions can reference.",
  idempotent: false,
  params: [
    { key: "url", label: "Source URL", type: "string", required: true },
    nameParam(),
    ...httpAuthParams(),
  ],
  output: [{ key: "url", type: "string", label: "PDF.co-hosted file URL" }],

  async execute(input, ctx) {
    const client = new PdfCoClient(ctx);
    return await client.post<Output>("/v1/file/upload/url", compact({ ...input }));
  },
};

export default fileUploadFromUrl;
