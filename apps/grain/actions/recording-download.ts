import type { ActionDefinition } from "@w6w/types";
import { encodeBase64, GrainClient } from "../lib/client.ts";
import { recordingIdParam } from "../lib/params.ts";

interface Output {
  content: string;
  contentType: string | null;
  encoding: "base64";
}

/**
 * `GET /_/public-api/v2/recordings/:recording_id/download` — the recording's
 * media file (the docs' own example uses `-L --output recording.mp4`,
 * following a redirect to the actual bytes). This action always returns the
 * body base64-encoded, since it is binary media rather than text, so it
 * survives JSON serialization intact.
 *
 * Whatever host the redirect lands on need not be declared in
 * `w6w.network.allow`: the runtime's egress allowlist only inspects the
 * request's own hostname, not hosts visited along a redirect chain, so the
 * redirect is followed transparently as a single logical `ctx.fetch` call
 * (the same behavior this pack documents for Box's `download-file` action).
 */
const recordingDownload: ActionDefinition<{ recordingId: string }, Output> = {
  key: "recording-download",
  type: "read",
  resource: "recording",
  title: "Download Recording",
  description: "Download a recording's media file, base64-encoded.",
  params: [recordingIdParam],
  output: [
    { key: "content", type: "string", label: "Base64-encoded file contents" },
    { key: "contentType", type: "string", label: "Content-Type Grain reported" },
    { key: "encoding", type: "string", label: "Always base64" },
  ],

  async execute(input, ctx) {
    const res = await new GrainClient(ctx).send(
      `/v2/recordings/${encodeURIComponent(input.recordingId)}/download`,
      { headers: { accept: "*/*" } },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Grain ${res.status} for GET download: ${text ? text.slice(0, 200) : res.statusText}`,
      );
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      content: encodeBase64(buf),
      contentType: res.headers.get("content-type"),
      encoding: "base64",
    };
  },
};

export default recordingDownload;
