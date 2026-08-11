import type { ActionDefinition } from "@w6w/types";
import { idFromRef, VimeoClient } from "../lib/client.ts";
import { videoIdParam } from "../lib/params.ts";

/**
 * `PUT /me/likes/{video_id}` — like a video.
 *
 * A `PUT`, and that is the point: liking is a set-membership assertion, so
 * running it twice leaves exactly one like. `204`, no body. `403` means the
 * account cannot like videos at all, which is a token-scope or account-state
 * problem rather than anything about this video.
 *
 * Requires a token with the `interact` scope. `idempotent: true`.
 */
interface Input {
  videoId: string;
}

const likeAdd: ActionDefinition<Input, { liked: boolean; videoId: string }> = {
  key: "like-add",
  type: "perform",
  resource: "like",
  title: "Like Video",
  description: "Like a video as the connected Vimeo account.",
  idempotent: true,
  params: [videoIdParam],
  output: [
    { key: "liked", type: "boolean", label: "Whether the like succeeded" },
    { key: "videoId", type: "string", label: "The video ID" },
  ],

  async execute(input, ctx) {
    const videoId = idFromRef(input.videoId, "Video ID");
    await new VimeoClient(ctx).request(`/me/likes/${videoId}`, { method: "PUT" });
    return { liked: true, videoId };
  },
};

export default likeAdd;
