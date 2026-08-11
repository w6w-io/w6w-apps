import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { showcaseIdParam } from "../lib/params.ts";

/**
 * `PUT /me/albums/{album_id}/videos/{video_id}` — add a video to a showcase.
 *
 * ## Why this action refuses to do bulk
 *
 * Vimeo's plural endpoint here is not an "add several" — it is
 * `replace_videos_in_showcase`: "This method **replaces all the videos** in the
 * specified showcase with a new set of one or more videos."
 * `PUT /me/albums/{album_id}/videos` with a `videos` list wipes whatever was
 * there. Wiring "add these three" to it would silently delete everything else
 * in the showcase, which is precisely the mistake the plural name invites.
 *
 * So this action adds videos one at a time through the single-video endpoint,
 * looping when given several. That is more requests, and it is the correct
 * trade: each `PUT` is a `204` that adds exactly one video and touches nothing
 * else. `showcase-video-replace` exists separately and says what it does in its
 * own name.
 *
 * Note also the sibling `PATCH /users/{user_id}/albums` (`update_showcases`),
 * which adds *one set of items to several showcases at once* — a different
 * shape again, not modelled here.
 *
 * `idempotent: true` — a video is in a showcase or it is not.
 */
interface Input {
  showcaseId: string;
  videoIds: string;
}

const showcaseVideoAdd: ActionDefinition<
  Input,
  { added: boolean; showcaseId: string; videoIds: string[] }
> = {
  key: "showcase-video-add",
  type: "perform",
  resource: "showcase",
  title: "Add Videos to Showcase",
  description:
    "Add one or more videos to a showcase, leaving the videos already in it alone. Adds them " +
    "one request at a time — Vimeo's bulk endpoint replaces the whole showcase instead.",
  idempotent: true,
  params: [
    showcaseIdParam,
    {
      key: "videoIds",
      label: "Video IDs",
      type: "string",
      required: true,
      placeholder: "258684937,273576296",
      hint: "Comma-separated. IDs or `/videos/…` URIs; both work. Each is one request.",
    },
  ],
  output: [
    { key: "added", type: "boolean", label: "Whether every add succeeded" },
    { key: "showcaseId", type: "string", label: "The showcase ID" },
    { key: "videoIds", type: "array", label: "The video IDs added" },
  ],

  async execute(input, ctx) {
    const showcaseId = idFromRef(input.showcaseId, "Showcase ID");
    const raw = toCsv(input.videoIds);
    if (!raw) throw new Error("Video IDs is required");
    const ids = raw.split(",").map((id) => idFromRef(id, "Video ID"));
    const client = new VimeoClient(ctx);

    for (const videoId of ids) {
      await client.request(`/me/albums/${showcaseId}/videos/${videoId}`, { method: "PUT" });
    }

    ctx.log("debug", "added videos to showcase", { showcase: showcaseId, count: ids.length });
    return { added: true, showcaseId, videoIds: ids };
  },
};

export default showcaseVideoAdd;
