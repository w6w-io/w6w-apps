import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";

/** `GET /v2/bot/info` — the connected LINE Official Account's own identity. */
const botInfoGet: ActionDefinition = {
  key: "bot-info-get",
  type: "read",
  resource: "bot",
  title: "Get Bot Info",
  description: "Get basic information about the connected LINE Official Account (bot).",
  output: [
    { key: "userId", type: "string", label: "User ID" },
    { key: "basicId", type: "string", label: "Basic ID" },
    { key: "premiumId", type: "string", label: "Premium ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "pictureUrl", type: "string", label: "Profile image URL" },
    { key: "chatMode", type: "string", label: "Chat mode (chat / bot)" },
    { key: "markAsReadMode", type: "string", label: "Auto-read mode (auto / manual)" },
  ],

  execute(_input, ctx) {
    return new LineClient(ctx).json("/v2/bot/info");
  },
};

export default botInfoGet;
