import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";
import { userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
}

/**
 * `DELETE /v2/bot/user/{userId}/richmenu` — remove the per-user rich menu linked to one user, so
 * they fall back to the app-wide default (if any).
 *
 * Idempotent: the end state (no per-user rich menu linked) is the same whether the user had one
 * linked or not.
 */
const richMenuUnlinkFromUser: ActionDefinition<Input> = {
  key: "rich-menu-unlink-from-user",
  type: "perform",
  resource: "rich-menu",
  title: "Unlink Rich Menu from User",
  description:
    "Remove the per-user rich menu linked to a user, falling back to the app-wide default.",
  idempotent: true,
  params: [userIdParam],
  output: [],

  execute(input, ctx) {
    const userId = String(input.userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    ctx.log("info", "unlinking a LINE rich menu from a user", { userId });
    return new LineClient(ctx).json(`/v2/bot/user/${encodeURIComponent(userId)}/richmenu`, {
      method: "DELETE",
    });
  },
};

export default richMenuUnlinkFromUser;
