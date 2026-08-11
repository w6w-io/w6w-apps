import type { ActionDefinition } from "@w6w/types";
import { idFromRef, VimeoClient } from "../lib/client.ts";
import { videoIdParam } from "../lib/params.ts";

/**
 * `DELETE /videos/{video_id}` — delete a video.
 *
 * Answers `204` with no body, so this action returns `{ deleted: true }` and
 * the id rather than an empty object. `403` means the authenticated user is not
 * the owner; Vimeo requires ownership, not merely edit access.
 *
 * Needs a token with the `delete` scope.
 *
 * `idempotent: true` — deleting an already-deleted video is not a second
 * destructive act. That is a statement about retry safety and emphatically not
 * about reversibility: this removes the video from Vimeo. The
 * `Fields` parameter is absent because Vimeo's own documentation says `fields`
 * is supported on "every kind of call except for DELETE".
 */
interface Input {
  videoId: string;
}

const videoDelete: ActionDefinition<Input, { deleted: boolean; videoId: string }> = {
  key: "video-delete",
  type: "perform",
  resource: "video",
  title: "Delete Video",
  description: "Permanently delete a video. The connected account must own it.",
  idempotent: true,
  params: [videoIdParam],
  output: [
    { key: "deleted", type: "boolean", label: "Whether the delete succeeded" },
    { key: "videoId", type: "string", label: "The deleted video ID" },
  ],

  async execute(input, ctx) {
    const videoId = idFromRef(input.videoId, "Video ID");
    await new VimeoClient(ctx).request(`/videos/${videoId}`, { method: "DELETE" });
    return { deleted: true, videoId };
  },
};

export default videoDelete;
