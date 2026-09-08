import type { ActionDefinition } from "@w6w/types";
import { GlideClient } from "../lib/client.ts";

/**
 * `POST /apps/{appID}/uploads/{uploadID}/complete` — finalize an upload
 * started with Create Upload and get the file's public URL.
 *
 * Call this only after the file's bytes have actually reached `uploadLocation`
 * (see Create Upload) — Glide answers `409` ("upload incomplete") if they
 * haven't. Glide deletes the file within 30 days unless its URL is stored in a
 * table.
 */
interface Input {
  appId: string;
  uploadId: string;
}

interface Output {
  url: string;
}

const uploadComplete: ActionDefinition<Input, Output> = {
  key: "upload-complete",
  type: "perform",
  resource: "upload",
  title: "Complete Upload",
  description: "Finalize an upload and get the file's public URL.",
  idempotent: false,
  params: [
    { key: "appId", label: "App ID", type: "string", required: true },
    { key: "uploadId", label: "Upload ID", type: "string", required: true },
  ],
  output: [{ key: "url", type: "string", label: "Public URL for the uploaded file" }],

  execute(input, ctx) {
    return new GlideClient(ctx).data<Output>(
      `/apps/${encodeURIComponent(input.appId)}/uploads/${
        encodeURIComponent(input.uploadId)
      }/complete`,
      { method: "POST" },
    );
  },
};

export default uploadComplete;
