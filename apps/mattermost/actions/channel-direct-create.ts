import type { ActionDefinition } from "@w6w/types";
import { MattermostClient } from "../lib/client.ts";

/**
 * `POST /api/v4/channels/direct` — open (or find) a direct-message channel.
 *
 * ## The body is a bare array of exactly two user ids
 *
 * Not an object — the vendor's schema is `type: array, items: string,
 * minItems: 2, maxItems: 2`. This is the only endpoint in the app whose request
 * body is not a JSON object, and sending `{"user_ids": [...]}` is a 400.
 *
 * ## One of the two ids must be the authenticated user
 *
 * A DM channel is between two people, and the token's own user has to be one of
 * them — you cannot open a DM between two *other* people. The usual pairing is
 * the bot's own id (from the Connection's display block) and the recipient's.
 *
 * ## It is idempotent by design
 *
 * A DM channel between a given pair is a singleton: calling this again returns
 * the same channel rather than creating a second one. That is what makes it safe
 * to call before every message instead of storing the channel id.
 */
interface Input {
  userIds: string;
}

const channelDirectCreate: ActionDefinition<Input> = {
  key: "channel-direct-create",
  type: "perform",
  resource: "channel",
  title: "Open Direct Message Channel",
  description:
    "Open the direct-message channel between two users, creating it if it does not exist. Returns " +
    "the same channel every time, so it is safe to call before each message.",
  idempotent: true,
  params: [
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      required: true,
      placeholder: "<your bot's user id>,<recipient's user id>",
      hint: "Exactly two, comma-separated. One of them must be the user this connection " +
        "authenticates as — you cannot open a DM between two other people.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The DM channel's id — pass it to Create Post" },
    { key: "type", type: "string", label: "`D` for a direct channel" },
  ],

  execute(input, ctx) {
    const ids = input.userIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length !== 2) {
      throw new Error(
        `User IDs must be exactly two ids, comma-separated — got ${ids.length}. A direct channel ` +
          "is between two people; use Create Channel for a group.",
      );
    }
    return new MattermostClient(ctx).request("/api/v4/channels/direct", {
      method: "POST",
      // A bare array, not an object — see the module doc.
      body: ids,
    });
  },
};

export default channelDirectCreate;
