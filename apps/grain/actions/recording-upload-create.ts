import type { ActionDefinition } from "@w6w/types";
import { compact, GrainClient } from "../lib/client.ts";

interface Input {
  filename: string;
  userId?: string;
}

interface Output {
  uuid: string;
  url: string;
  maxDurationSec: number;
  maxUploadBytes: number;
}

/**
 * `POST /_/public-api/v2/recordings/upload` — step 1 of Grain's two-step
 * upload: mint a single-use URL a client can `PUT` a `.mov` / `.mp4` / `.mp3`
 * / `.m4a` file to directly.
 *
 * **Only this half is modelled.** The bytes never pass through this
 * workflow — step 2 (`PUT` the file to the returned `url`) is a plain
 * upload to a host this app cannot know in advance (Grain's own docs example
 * uses a placeholder `https://example.com/generated_url`), so it is left to
 * whatever client obtained this URL, the same way this pack's `mux`
 * `upload-create` action stops at minting a direct-upload URL rather than
 * performing the `PUT` itself.
 *
 * `user_id` is documented "**Workspace API Only**, required" — i.e.
 * mandatory when authenticated with a Workspace Access Token (to say which
 * workspace member owns the resulting recording), and inapplicable to a
 * Personal Access Token connection. It is optional here rather than
 * required, since this app cannot tell which token type is connected.
 *
 * Grain still needs to process the uploaded file after the `PUT` completes;
 * progress and the resulting `recording_id` are delivered to any
 * `upload_status` hook (see Create Hook), not returned synchronously here.
 */
const recordingUploadCreate: ActionDefinition<Input, Output> = {
  key: "recording-upload-create",
  type: "perform",
  resource: "recording",
  title: "Create Recording Upload URL",
  description:
    "Mint a single-use URL to PUT a .mov/.mp4/.mp3/.m4a file to — the bytes never pass through " +
    "this workflow. Grain notifies upload_status hooks once processing finishes.",
  // Each call mints a fresh uuid/url; Grain offers no request key to dedupe on.
  idempotent: false,
  params: [
    {
      key: "filename",
      label: "Filename",
      type: "string",
      required: true,
      hint: "Name of the file that will be uploaded, e.g. recording.mp4.",
      placeholder: "recording.mp4",
    },
    {
      key: "userId",
      label: "User ID (Workspace API only)",
      type: "string",
      hint: "Required when authenticated with a Workspace Access Token — who will own the " +
        "resulting recording. UUID from List Users. Not applicable to a Personal Access Token.",
    },
  ],
  output: [
    { key: "uuid", type: "string", label: "Upload ID — appears in upload_status hook payloads" },
    { key: "url", type: "string", label: "PUT the file to this URL" },
    { key: "maxDurationSec", type: "number", label: "Max duration in seconds the upload can be" },
    { key: "maxUploadBytes", type: "number", label: "Max size in bytes the upload can be" },
  ],

  async execute(input, ctx) {
    const body = await new GrainClient(ctx).request<
      { uuid?: string; url?: string; max_duration_sec?: number; max_upload_bytes?: number }
    >("/v2/recordings/upload", {
      method: "POST",
      body: compact({ filename: input.filename, user_id: input.userId }),
    });
    return {
      uuid: body?.uuid ?? "",
      url: body?.url ?? "",
      maxDurationSec: body?.max_duration_sec ?? 0,
      maxUploadBytes: body?.max_upload_bytes ?? 0,
    };
  },
};

export default recordingUploadCreate;
