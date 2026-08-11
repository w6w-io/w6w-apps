import type { ActionDefinition } from "@w6w/types";
import { TwitchClient } from "../lib/client.ts";
import { announcementColorOptions, broadcasterIdParam } from "../lib/params.ts";

/**
 * `POST /helix/chat/announcements` — Send Chat Announcement.
 *
 * **Requires a user access token with the `moderator:manage:announcements`
 * scope**, and `moderator_id` must be that token's own user. (Twitch documents
 * an app-token path too, but it requires the app to already hold `user:bot` for
 * the moderator and `channel:bot` for the broadcaster through prior
 * authorizations — a chatbot deployment, not something a connection form can
 * establish. It is therefore not offered here, and `for_source_only`, which is
 * app-token-only and a 400 with a user token, is not offered either.)
 *
 * Wire shape: `broadcaster_id` and `moderator_id` are **query** parameters,
 * `message` and `color` are in the **body**. Success is `204 No Content` — there
 * is no announcement object to return, so this action reports the status.
 *
 * Twitch truncates a message over 500 characters rather than rejecting it, so
 * the length is validated here instead: a silently halved announcement is worse
 * than an error.
 *
 * `idempotent: false` — a retry posts a second announcement into the chat room.
 * Twitch's own limit of one announcement every two seconds is the only thing
 * standing between a retry loop and a spammed channel.
 */
interface Input {
  broadcasterId: string;
  moderatorId: string;
  message: string;
  color?: string;
}

const sendChatAnnouncement: ActionDefinition<Input, { status: number }> = {
  key: "send-chat-announcement",
  type: "perform",
  title: "Send Chat Announcement",
  description:
    "Post a highlighted announcement into a channel's chat room. Requires a user access token " +
    "with the moderator:manage:announcements scope, belonging to the moderator ID given. Twitch " +
    "allows one announcement every two seconds and answers 204 with no body.",
  resource: "chat",
  idempotent: false,
  params: [
    broadcasterIdParam("The channel whose chat room receives the announcement."),
    {
      key: "moderatorId",
      label: "Moderator ID",
      type: "string",
      required: true,
      hint: "The user sending it — the broadcaster themselves, or one of their moderators. Must " +
        "be the user the access token belongs to.",
    },
    {
      key: "message",
      label: "Message",
      type: "text",
      required: true,
      validation: { maxLength: 500 },
      hint: "Up to 500 characters. Twitch silently truncates anything longer, so this action " +
        "refuses it instead.",
    },
    {
      key: "color",
      label: "Highlight colour",
      type: "select",
      options: announcementColorOptions,
      hint: 'Case-sensitive. "primary" (the default) uses the channel\'s own accent colour.',
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const message = input.message ?? "";
    if (message.trim().length === 0) {
      throw new Error("Send Chat Announcement needs a non-empty message");
    }
    if (message.length > 500) {
      throw new Error(
        `announcement is ${message.length} characters; Twitch truncates anything over 500`,
      );
    }

    const body: Record<string, unknown> = { message };
    if (input.color) body.color = input.color;

    ctx.log("info", "twitch: send chat announcement");
    const status = await new TwitchClient(ctx).status("/chat/announcements", {
      method: "POST",
      query: { broadcaster_id: input.broadcasterId, moderator_id: input.moderatorId },
      body,
    });
    return { status };
  },
};

export default sendChatAnnouncement;
