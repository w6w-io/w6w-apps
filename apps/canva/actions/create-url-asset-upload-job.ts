import type { ActionDefinition } from "@w6w/types";
import { CanvaClient } from "../lib/client.ts";

interface Input {
  name: string;
  url: string;
}

/**
 * `POST /v1/url-asset-uploads` — requires `asset:write`. Rate limited to 30
 * requests/minute per user. A Canva **preview** API: it may change without
 * a version bump, and integrations relying on it don't clear Canva's own
 * review process.
 *
 * The source URL must be publicly reachable — Canva's servers fetch it, this
 * app never does. Video uploaded this way is capped at 100MB; larger video
 * needs `create-asset-upload-job` with the bytes supplied directly.
 *
 * ASYNCHRONOUS: returns `{ job: { id, status: "in_progress" } }`. Poll
 * `get-url-asset-upload-job` for the result.
 */
const createUrlAssetUploadJob: ActionDefinition<Input> = {
  key: "create-url-asset-upload-job",
  type: "perform",
  resource: "asset",
  title: "Create Asset Upload Job From URL",
  description: "Start an asynchronous job to import an image or video asset from a public " +
    "URL. Preview API — see description.",
  // Each call starts a new import job and, on success, a new asset.
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Asset name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 255 },
    },
    {
      key: "url",
      label: "Source URL",
      type: "string",
      required: true,
      hint: "Must be publicly accessible from the internet.",
      validation: { minLength: 8, maxLength: 2048 },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "status", type: "string", label: "Job status" },
  ],

  async execute(input, ctx) {
    const client = new CanvaClient(ctx);
    const res = await client.request<{ job: Record<string, unknown> }>(
      "/rest/v1/url-asset-uploads",
      { method: "POST", body: { name: input.name, url: input.url } },
    );
    return res.job;
  },
};

export default createUrlAssetUploadJob;
