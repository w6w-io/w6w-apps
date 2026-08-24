import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  videoId: string;
}

/**
 * `GET /v3/videos/{video_id}` — the poll target for `video-create`, `video-translation-create`
 * and `template-video-generate`. `status` is one of `pending`/`processing`/`completed`/`failed`;
 * on `failed`, `failure_code`/`failure_message` name the reason (see HeyGen's Error Codes doc).
 * If `output_language` is present the row is a translated video rather than a generated one.
 */
const videoGet: ActionDefinition<Input> = {
  key: "video-get",
  type: "read",
  resource: "video",
  title: "Get Video",
  description: "Fetch a video's status and, once completed, its download URLs.",
  params: [{ key: "videoId", label: "Video ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The video" }],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data(`/v3/videos/${encodeURIComponent(input.videoId)}`);
  },
};

export default videoGet;
