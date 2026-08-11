import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { broadcasterIdParam } from "../lib/params.ts";

/**
 * `GET /helix/chat/settings` — Get Chat Settings.
 *
 * Slow mode, follower-only mode, subscriber-only mode, unique-chat mode and the
 * non-moderator delay for a channel's chat room.
 *
 * The response is **conditionally shaped**, which is the thing to know:
 * `moderator_id`, `non_moderator_chat_delay` and
 * `non_moderator_chat_delay_duration` appear only when the request carries a
 * user access token with `moderator:read:chat_settings` *and* names a
 * `moderator_id` that is the broadcaster or one of their moderators. With an app
 * access token those three fields are simply absent — not `false`, not `null` —
 * so `settings.non_moderator_chat_delay === false` is a wrong reading of "we
 * were not allowed to see it".
 *
 * `data` is a list containing exactly one object.
 */
interface Input {
  broadcasterId: string;
  moderatorId?: string;
}

const getChatSettings: ActionDefinition<Input> = {
  key: "get-chat-settings",
  type: "read",
  title: "Get Chat Settings",
  description:
    "Read a channel's chat settings: emote-only, follower-only, subscriber-only, unique-chat and " +
    "slow mode. The non-moderator delay fields are returned only for a user access token with " +
    "the moderator:read:chat_settings scope; otherwise they are absent from the response.",
  resource: "chat",
  params: [
    broadcasterIdParam(),
    {
      key: "moderatorId",
      label: "Moderator ID",
      type: "string",
      hint: "Set only to include the non-moderator delay settings. Must equal the user ID in the " +
        "user access token, and that user must be the broadcaster or one of their moderators.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Chat settings (exactly one item)" },
    { key: "data[].broadcaster_id", type: "string", label: "Broadcaster ID" },
    { key: "data[].emote_mode", type: "boolean", label: "Emote-only mode" },
    { key: "data[].follower_mode", type: "boolean", label: "Follower-only mode" },
    {
      key: "data[].follower_mode_duration",
      type: "number",
      label: "Follow age required (minutes)",
    },
    { key: "data[].slow_mode", type: "boolean", label: "Slow mode" },
    { key: "data[].slow_mode_wait_time", type: "number", label: "Slow-mode wait (seconds)" },
    { key: "data[].subscriber_mode", type: "boolean", label: "Subscriber-only mode" },
    { key: "data[].unique_chat_mode", type: "boolean", label: "Unique-chat mode" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "twitch: get chat settings");
    return await new TwitchClient(ctx).get("/chat/settings", {
      broadcaster_id: input.broadcasterId,
      moderator_id: input.moderatorId,
    });
  },
};

export default getChatSettings;
