import type { ActionDefinition } from "@w6w/types";
import { toList, TwitchClient } from "../lib/client.ts";

/**
 * `GET /helix/chat/color` — Get User Chat Color.
 *
 * The colour a user's name is drawn in, in chat. `user_id` is a repeated key,
 * up to 100 ids; duplicates and unknown ids are dropped from the response
 * rather than reported, so a short list is a lookup miss.
 *
 * `color` is an **empty string**, not null and not a default hex, when the user
 * has never picked one — Twitch then colours their name randomly per channel,
 * which no API reports.
 */
interface Input {
  userId: string[] | string;
}

const getUserChatColor: ActionDefinition<Input> = {
  key: "get-user-chat-color",
  type: "read",
  title: "Get User Chat Color",
  description:
    "Read the hex colour one or more users' names are drawn in, in chat. An empty colour means " +
    "the user never chose one, so Twitch randomises it per channel.",
  resource: "chat",
  params: [
    {
      key: "userId",
      label: "User IDs",
      type: "string",
      required: true,
      placeholder: "141981764",
      hint: "One or more numeric user IDs, comma-separated, up to 100.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Users and their chat colours" },
    { key: "data[].user_id", type: "string", label: "User ID" },
    { key: "data[].user_login", type: "string", label: "Login name" },
    { key: "data[].user_name", type: "string", label: "Display name" },
    { key: "data[].color", type: "string", label: "Hex colour, or empty" },
  ],

  async execute(input, ctx) {
    const ids = toList(input.userId);
    if (!ids) throw new Error("Get User Chat Color needs at least one user ID");
    ctx.log("info", "twitch: get user chat color");
    return await new TwitchClient(ctx).get("/chat/color", { user_id: ids });
  },
};

export default getUserChatColor;
