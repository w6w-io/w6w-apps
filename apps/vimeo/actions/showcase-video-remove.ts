import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { showcaseIdParam } from "../lib/params.ts";

/**
 * `DELETE /me/albums/{album_id}/videos/{video_id}` — take a video out of a
 * showcase.
 *
 * There is no bulk remove: Vimeo publishes only the single-video endpoint, so
 * several videos are several requests. (The plural `PUT .../videos` is a
 * *replace*, which `showcase-video-replace` covers.)
 *
 * This removes the video from the showcase. It does not delete the video —
 * showcases hold references, not the videos themselves, and Vimeo offers no
 * `should_delete_clips` equivalent here as it does on folders.
 *
 * Answers `204`. `idempotent: true`.
 */
interface Input {
  showcaseId: string;
  videoIds: string;
}

const showcaseVideoRemove: ActionDefinition<
  Input,
  { removed: boolean; showcaseId: string; videoIds: string[] }
> = {
  key: "showcase-video-remove",
  type: "perform",
  resource: "showcase",
  title: "Remove Videos from Showcase",
  description:
    "Take one or more videos out of a showcase. The videos themselves stay in the account.",
  idempotent: true,
  params: [
    showcaseIdParam,
    {
      key: "videoIds",
      label: "Video IDs",
      type: "string",
      required: true,
      placeholder: "258684937,273576296",
      hint: "Comma-separated. Vimeo has no bulk remove, so each is one request.",
    },
  ],
  output: [
    { key: "removed", type: "boolean", label: "Whether every removal succeeded" },
    { key: "showcaseId", type: "string", label: "The showcase ID" },
    { key: "videoIds", type: "array", label: "The video IDs removed" },
  ],

  async execute(input, ctx) {
    const showcaseId = idFromRef(input.showcaseId, "Showcase ID");
    const raw = toCsv(input.videoIds);
    if (!raw) throw new Error("Video IDs is required");
    const ids = raw.split(",").map((id) => idFromRef(id, "Video ID"));
    const client = new VimeoClient(ctx);

    for (const videoId of ids) {
      await client.request(`/me/albums/${showcaseId}/videos/${videoId}`, { method: "DELETE" });
    }

    return { removed: true, showcaseId, videoIds: ids };
  },
};

export default showcaseVideoRemove;
