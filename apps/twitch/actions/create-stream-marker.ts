import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";

/**
 * `POST /helix/streams/markers` — Create Stream Marker.
 *
 * **Requires a user access token with the `channel:manage:broadcast` scope.**
 * The `user_id` must be the token's own user, or the token's user must be one of
 * that broadcaster's editors.
 *
 * A marker is a bookmark at the current point of a live stream, used later to
 * cut highlights. Twitch documents three states where the request fails with
 * `404`, and all three are ordinary rather than exceptional: the stream is not
 * live, the channel has VOD storage turned off, or the broadcast is a rerun.
 * The 404 body's `message` says which, and is surfaced verbatim.
 *
 * Note the parameter placement, which is the reverse of Send Chat Announcement
 * and Create Clip: here everything is in the **body**, including `user_id`.
 *
 * `idempotent: false` — the marker is stamped at "now", so a retry after a
 * dropped connection produces a second marker a few seconds further into the
 * stream rather than the same one.
 */
interface Input {
  userId: string;
  description?: string;
}

const createStreamMarker: ActionDefinition<Input> = {
  key: "create-stream-marker",
  type: "perform",
  title: "Create Stream Marker",
  description:
    "Mark the current point of a live stream so it can be turned into a highlight later. " +
    "Requires a user access token with the channel:manage:broadcast scope, for the broadcaster " +
    "or one of their editors. Fails with 404 if the stream is not live, is a rerun, or the " +
    "channel has VOD storage disabled.",
  resource: "stream",
  idempotent: false,
  params: [
    {
      key: "userId",
      label: "Broadcaster ID",
      type: "string",
      required: true,
      placeholder: "141981764",
      hint: "The broadcaster who is streaming. Must be the token's own user, or a broadcaster " +
        "who has made that user an editor.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      validation: { maxLength: 140 },
      hint: "Optional note about why this moment was marked. Maximum 140 characters.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "The created marker (one item)" },
    { key: "data[].id", type: "string", label: "Marker ID" },
    { key: "data[].created_at", type: "string", label: "Created at (RFC3339)" },
    { key: "data[].position_seconds", type: "number", label: "Offset from stream start (seconds)" },
    { key: "data[].description", type: "string", label: "Description" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: create stream marker");
    const body: Record<string, unknown> = { user_id: input.userId };
    if (input.description) body.description = input.description;
    return await new TwitchClient(ctx).send("/streams/markers", { method: "POST", body });
  },
};

export default createStreamMarker;
