import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { broadcasterIdParam } from "../lib/params.ts";

/**
 * `POST /helix/clips` — Create Clip.
 *
 * **Requires a user access token with the `clips:edit` scope.**
 *
 * Three things the reference is unusually explicit about, all of which change
 * how a workflow should be written around this action:
 *
 *  1. **Success is `202 Accepted`, not `200`.** Clipping is asynchronous.
 *  2. **A 202 does not mean the clip exists.** Twitch's own instruction is to
 *     poll Get Clips with the returned id, and "if after 60 seconds Get Clips
 *     hasn't returned the clip, assume it failed". So the returned `id` is a
 *     claim ticket, not a clip.
 *  3. **The window is fixed and backwards.** Twitch captures up to 90 seconds
 *     *ending around the moment you call*, then publishes the last 30 of them
 *     with a default title. `edit_url` is how a human trims it, and it is valid
 *     for 24 hours or until published, whichever is first.
 *
 * `title` and `duration` are documented as query parameters on this endpoint —
 * despite it being a POST — so they are sent as such.
 *
 * The 404 case is ordinary rather than exceptional: the broadcaster must be
 * live. A 403 means clipping is restricted to followers or subscribers, is
 * disabled on the channel, or the token's user is banned there.
 *
 * `idempotent: false` — each call captures a new window at a new moment, so a
 * retry produces a second, different clip.
 */
interface Input {
  broadcasterId: string;
  title?: string;
  duration?: number;
}

const createClip: ActionDefinition<Input> = {
  key: "create-clip",
  type: "perform",
  title: "Create Clip",
  description:
    "Capture a clip from a broadcaster's live stream. Requires a user access token with the " +
    "clips:edit scope, and the broadcaster must be live. Twitch answers 202 Accepted with a " +
    "clip ID before the clip exists — poll Get Clips with that ID to confirm, and treat 60 " +
    "seconds without a result as a failure.",
  resource: "clip",
  idempotent: false,
  params: [
    broadcasterIdParam("The broadcaster to clip. They must be streaming live right now."),
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Optional. Twitch generates one if omitted. A title that fails AutoMod review makes " +
        "the whole request a 400.",
    },
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      validation: { min: 5, max: 60 },
      hint: "5 to 60 seconds, in tenths. Twitch's default is 30.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "The claimed clip (one item)" },
    { key: "data[].id", type: "string", label: "Clip ID — poll Get Clips with it" },
    { key: "data[].edit_url", type: "string", label: "Edit URL, valid 24 hours" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: create clip");
    return await new TwitchClient(ctx).send("/clips", {
      method: "POST",
      query: {
        broadcaster_id: input.broadcasterId,
        title: input.title,
        duration: input.duration,
      },
    });
  },
};

export default createClip;
