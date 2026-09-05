import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";
import { richMenuIdParam, userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
  richMenuId: string;
}

/**
 * `POST /v2/bot/user/{userId}/richmenu/{richMenuId}` — show this rich menu to one specific user,
 * overriding both the app-wide default and Official Account Manager's own default.
 *
 * Idempotent: only one rich menu can ever be linked to a user at a time, so calling this again
 * (same or different rich menu) simply replaces it — the correct outcome for a retry.
 */
const richMenuLinkToUser: ActionDefinition<Input> = {
  key: "rich-menu-link-to-user",
  type: "perform",
  resource: "rich-menu",
  title: "Link Rich Menu to User",
  description: "Show this rich menu to one user, replacing any rich menu already linked to them.",
  idempotent: true,
  params: [userIdParam, richMenuIdParam],
  output: [],

  execute(input, ctx) {
    const userId = String(input.userId ?? "").trim();
    const richMenuId = String(input.richMenuId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    if (!richMenuId) throw new Error("`richMenuId` is required");
    ctx.log("info", "linking a LINE rich menu to a user", { richMenuId });
    return new LineClient(ctx).json(
      `/v2/bot/user/${encodeURIComponent(userId)}/richmenu/${encodeURIComponent(richMenuId)}`,
      { method: "POST" },
    );
  },
};

export default richMenuLinkToUser;
