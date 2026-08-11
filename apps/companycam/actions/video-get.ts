import type { ActionDefinition } from "@w6w/types";
import { CompanyCamClient, encodeId } from "../lib/client.ts";

/**
 * `GET /v2/videos/{id}` — one video.
 *
 * This is the endpoint the vendor tells you to poll: "Poll this endpoint until
 * `status: processed` before consuming `playback_url`/`format`." Until then
 * both fields describe the raw upload rather than the HLS stream. The
 * `video.updated` webhook is the push alternative.
 *
 * One of only two operations in this API with a documented `403` (the other is
 * archiving a project) — a video the credential may not see is refused rather
 * than reported missing.
 */
interface Input {
  videoId: string;
}

const videoGet: ActionDefinition<Input> = {
  key: "video-get",
  type: "read",
  resource: "video",
  title: "Retrieve Video",
  description:
    "Fetch one video. Poll until status is processed before using playback_url or format.",
  params: [
    { key: "videoId", label: "Video ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Video ID" },
    { key: "project_id", type: "string", label: "Project ID" },
    { key: "status", type: "string", label: "Processing status" },
    { key: "playback_url", type: "string", label: "Playback URL (valid once processed)" },
    { key: "format", type: "string", label: "Format (m3u8 once processed)" },
    { key: "duration", type: "number", label: "Duration" },
    { key: "thumbnail_urls", type: "object", label: "Thumbnails" },
  ],

  execute(input, ctx) {
    return new CompanyCamClient(ctx).json(`/videos/${encodeId(input.videoId)}`);
  },
};

export default videoGet;
