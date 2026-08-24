import type { ActionDefinition } from "@w6w/types";
import { HeyGenClient } from "../lib/client.ts";

interface Input {
  videoId: string;
}

/** `DELETE /v3/videos/{video_id}` — permanent. Retrying a delete is safe: the end state (gone) is the same either way, even though a second call answers `404 video_not_found` rather than the original `{id, deleted: true}`. */
const videoDelete: ActionDefinition<Input> = {
  key: "video-delete",
  type: "perform",
  resource: "video",
  title: "Delete Video",
  description: "Permanently delete a video. Cannot be undone.",
  idempotent: true,
  params: [{ key: "videoId", label: "Video ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Deleted video ID" },
    { key: "deleted", type: "boolean", label: "Always true on success" },
  ],

  execute(input, ctx) {
    const client = new HeyGenClient(ctx);
    return client.data(`/v3/videos/${encodeURIComponent(input.videoId)}`, { method: "DELETE" });
  },
};

export default videoDelete;
