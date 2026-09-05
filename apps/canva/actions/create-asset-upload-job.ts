import type { ActionDefinition } from "@w6w/types";
import { base64ToBytes, CanvaClient, toBase64 } from "../lib/client.ts";

interface Input {
  name: string;
  file: string;
}

/**
 * `POST /v1/asset-uploads` — requires `asset:write`. Rate limited to 30
 * requests/minute per user.
 *
 * This is the one action here that doesn't send JSON: the body is the raw
 * asset bytes (`application/octet-stream`), and the name travels in a
 * separate `Asset-Upload-Metadata` header as base64 — Canva's own reason is
 * that a plain header can't carry emoji or other non-ASCII characters
 * safely, since asset names are user-facing.
 *
 * This is an ASYNCHRONOUS job: the response is `{ job: { id, status } }`
 * with `status: "in_progress"`, not the finished asset. Poll
 * `get-asset-upload-job` with the returned job ID until `status` is
 * `success` or `failed`.
 */
const createAssetUploadJob: ActionDefinition<Input> = {
  key: "create-asset-upload-job",
  type: "perform",
  resource: "asset",
  title: "Create Asset Upload Job",
  description: "Start an asynchronous job to upload an image or video asset. Poll " +
    "get-asset-upload-job with the returned job ID for the result.",
  // Each call starts a new upload job and, on success, a new asset; a retry
  // after a dropped response risks a duplicate upload rather than
  // converging on the same result.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Asset name",
      type: "string",
      required: true,
      hint: "Maximum 50 characters (unencoded) in the Canva UI.",
    },
    {
      key: "file",
      label: "File (base64)",
      type: "file",
      required: true,
      hint: "The file's bytes, base64-encoded — a `data:<mime>;base64,...` URL or bare base64.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const bytes = base64ToBytes(input.file);
    const res = await client.request<{ job: Record<string, unknown> }>("/rest/v1/asset-uploads", {
      method: "POST",
      rawBody: bytes,
      headers: {
        "Asset-Upload-Metadata": JSON.stringify({ name_base64: toBase64(input.name) }),
      },
    });
    return res.job;
  },
};

export default createAssetUploadJob;
