import type { ActionDefinition } from "@w6w/types";
import { encodeId, QualtricsClient } from "../lib/client.ts";
import { idParam, surveyIdParam } from "../lib/params.ts";

interface Input {
  surveyId: string;
  fileId: string;
}

interface Output {
  content: string;
  encoding: "base64";
  contentType: string;
}

/** base64-encode a byte array (no url-safe transformation). */
function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/**
 * `GET /API/v3/surveys/{surveyId}/export-responses/{fileId}/file` — the
 * finished export.
 *
 * Confirmed live on 2026-09-22 (`400 ATP_2` unauthenticated, not a 404). The
 * response is bytes — a ZIP archive containing the exported file(s) — not JSON,
 * so it is base64-encoded into a string with its transport content type
 * reported alongside, the same shape `boldsign`, `signnow` and `dropbox-sign`
 * already use in this pack for a file-shaped response crossing the worker
 * boundary.
 *
 * `fileId` comes from Response Export Status once the job reports `complete`.
 */
const responseExportFileGet: ActionDefinition<Input, Output> = {
  key: "response-export-file-get",
  type: "read",
  resource: "response-export",
  title: "Download Response Export",
  description: "Download a completed response export, base64-encoded.",
  params: [
    surveyIdParam,
    idParam("fileId", "File ID", "Returned by Response Export Status once the job is complete."),
  ],
  output: [
    { key: "content", type: "string", label: "Export bytes, base64-encoded" },
    { key: "encoding", type: "string", label: "Encoding — always `base64`" },
    { key: "contentType", type: "string", label: "Transport content type" },
  ],

  async execute(input, ctx) {
    const res = await new QualtricsClient(ctx).raw(
      `/surveys/${encodeId(input.surveyId)}/export-responses/${encodeId(input.fileId)}/file`,
      { accept: "*/*" },
    );
    return {
      content: encodeBase64(res.bytes),
      encoding: "base64",
      contentType: res.contentType || "application/zip",
    };
  },
};

export default responseExportFileGet;
