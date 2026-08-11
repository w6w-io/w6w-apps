import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, VimeoClient } from "../lib/client.ts";
import { fieldsParam, videoIdParam } from "../lib/params.ts";

/**
 * `GET /videos/{video_id}` — one video.
 *
 * ## The full representation includes a cleartext password
 *
 * The video representation has 380 documented fields, and `password` is one of
 * the top-level ones: "The privacy-enabled password to watch the video. Only
 * the video's owner and team members with permission can access the video's
 * password. This data requires a bearer token with the `private` scope."
 *
 * It is returned by default. That is not a Vimeo bug and it is not this app's
 * to hide — it is the caller's own data — but it means a workflow that fetches
 * a video and logs the result has just written a password into a log. The
 * `Fields` param is the vendor's supported answer and is why every read here
 * offers it.
 *
 * `time_links` is Vimeo's own documented flag for rendering timestamps in the
 * description as links.
 */
interface Input {
  videoId: string;
  timeLinks?: boolean;
  fields?: string;
}

const videoGet: ActionDefinition<Input> = {
  key: "video-get",
  type: "read",
  resource: "video",
  title: "Get Video",
  description: "Fetch a single video by ID.",
  params: [
    videoIdParam,
    {
      key: "timeLinks",
      label: "Timestamps as links",
      type: "boolean",
      hint: "Render timestamps in the description as links.",
    },
    fieldsParam,
  ],
  output: [{ key: "uri", type: "string", label: "The video (full representation)" }],

  execute(input, ctx) {
    return new VimeoClient(ctx).request(`/videos/${idFromRef(input.videoId, "Video ID")}`, {
      query: { time_links: input.timeLinks, fields: toCsv(input.fields) },
    });
  },
};

export default videoGet;
