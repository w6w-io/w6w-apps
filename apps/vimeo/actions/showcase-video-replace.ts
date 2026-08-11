import type { ActionDefinition } from "@w6w/types";
import { idFromRef, toCsv, videoUri, VimeoClient } from "../lib/client.ts";
import { fieldsParam, showcaseIdParam } from "../lib/params.ts";

/**
 * `PUT /me/albums/{album_id}/videos` — replace every video in a showcase.
 *
 * Vimeo's own summary: "This method **replaces all the videos** in the
 * specified showcase with a new set of one or more videos." Whatever was in the
 * showcase and is not in this list is removed from it.
 *
 * It exists as its own action, with `replace` in the name, precisely so that
 * nobody reaches it while meaning "add". `showcase-video-add` is the additive
 * one.
 *
 * The body field is `videos` — a comma-separated list of full video **URIs**,
 * not ids. Bare ids are rejected, which is why `videoUri()` canonicalises
 * whatever the caller pasted.
 *
 * Answers `201`, not `204` — Vimeo documents this one as a creation.
 *
 * `idempotent: true`: the showcase ends up holding exactly this set however
 * many times it runs. Destructive, but convergently so.
 */
interface Input {
  showcaseId: string;
  videoIds: string;
  fields?: string;
}

const showcaseVideoReplace: ActionDefinition<Input> = {
  key: "showcase-video-replace",
  type: "perform",
  resource: "showcase",
  title: "Replace Showcase Videos",
  description:
    "Set the showcase's contents to exactly this list of videos. Anything already in it and not " +
    "listed is removed.",
  idempotent: true,
  params: [
    showcaseIdParam,
    {
      key: "videoIds",
      label: "Video IDs",
      type: "string",
      required: true,
      placeholder: "258684937,273576296",
      hint: "Comma-separated. This becomes the showcase's entire contents — anything missing " +
        "from the list is removed from the showcase.",
    },
    fieldsParam,
  ],
  output: [{ key: "data", type: "array", label: "The showcase's videos after the replacement" }],

  execute(input, ctx) {
    const showcaseId = idFromRef(input.showcaseId, "Showcase ID");
    const raw = toCsv(input.videoIds);
    if (!raw) throw new Error("Video IDs is required");

    return new VimeoClient(ctx).request(`/me/albums/${showcaseId}/videos`, {
      method: "PUT",
      query: { fields: toCsv(input.fields) },
      // `videos`, not `uris`, and full URIs rather than ids — the folder bulk
      // endpoints spell the same idea the other way round.
      body: { videos: raw.split(",").map(videoUri).join(",") },
    });
  },
};

export default showcaseVideoReplace;
