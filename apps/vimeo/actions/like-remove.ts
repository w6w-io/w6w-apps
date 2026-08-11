import type { ActionDefinition } from "@w6w/types";
import { idFromRef, VimeoClient } from "../lib/client.ts";
import { videoIdParam } from "../lib/params.ts";

/**
 * `DELETE /me/likes/{video_id}` — unlike a video.
 *
 * The mirror of `like-add`, and equally a set operation: `204`, no body, and
 * the same end state however many times it runs.
 *
 * The neighbouring `GET /me/likes/{video_id}` — "check if the user has liked a
 * video" — is deliberately not exposed as an action: it answers `204` for liked
 * and **`404` for not liked**, so as a w6w action it would have to raise on the
 * perfectly ordinary "no" answer. Reading `metadata.interactions.like` off the
 * video, or listing likes, answers the same question without turning a fact
 * into an error. The README says so.
 *
 * `idempotent: true`.
 */
interface Input {
  videoId: string;
}

const likeRemove: ActionDefinition<Input, { unliked: boolean; videoId: string }> = {
  key: "like-remove",
  type: "perform",
  resource: "like",
  title: "Unlike Video",
  description: "Remove the connected account's like from a video.",
  idempotent: true,
  params: [videoIdParam],
  output: [
    { key: "unliked", type: "boolean", label: "Whether the unlike succeeded" },
    { key: "videoId", type: "string", label: "The video ID" },
  ],

  async execute(input, ctx) {
    const videoId = idFromRef(input.videoId, "Video ID");
    await new VimeoClient(ctx).request(`/me/likes/${videoId}`, { method: "DELETE" });
    return { unliked: true, videoId };
  },
};

export default likeRemove;
