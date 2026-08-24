import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { idParam, refParam } from "../lib/params.ts";

/**
 * `GET /documents/{id}/download.json` — per the OpenAPI document's own
 * summary, this "will return a 303 See Other redirecting to the download URL
 * for the Document."
 *
 * **This action returns the download URL; it does not fetch the file's
 * bytes.** The `Location` Clio redirects to is a per-request, pre-signed URL
 * on a Clio-operated S3 bucket (`clio-manage-prod-*-a-documents.s3.<region>.
 * amazonaws.com`, `documents.goclio.com`, `documents.goclio.eu`, ... —
 * enumerated from the Content-Security-Policy this app observed on a live
 * `app.clio.com` page on 2026-08-24). Which exact host answers varies by
 * account region and cannot be a fixed `network.allow` entry the way
 * `app.clio.com` itself can, so `ctx.fetch` here is called with
 * `redirect: "manual"` and the `Location` header is returned as-is. The URL
 * is short-lived — treat it as a one-time link to hand to whatever step
 * needs the actual bytes, not something to store.
 */
interface Input {
  id: number;
  documentVersionId?: number;
}

const documentDownloadGet: ActionDefinition<Input> = {
  key: "document-download-get",
  type: "read",
  resource: "document",
  title: "Get Document Download URL",
  description: "Resolve a document's short-lived, pre-signed download URL, without fetching the " +
    "file's bytes.",
  params: [
    idParam("Document ID"),
    refParam(
      "documentVersionId",
      "Document version ID",
      "Leave empty for the latest version.",
    ),
  ],
  output: [{ key: "downloadUrl", type: "string", label: "Pre-signed, short-lived download URL" }],

  async execute(input, ctx) {
    const url = await new ClioClient(ctx).redirectLocation(`/documents/${input.id}/download.json`, {
      query: { document_version_id: input.documentVersionId },
    });
    return { downloadUrl: url };
  },
};

export default documentDownloadGet;
