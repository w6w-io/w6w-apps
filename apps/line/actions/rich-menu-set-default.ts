import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";
import { richMenuIdParam } from "../lib/params.ts";

interface Input {
  richMenuId: string;
}

/**
 * `POST /v2/bot/user/all/richmenu/{richMenuId}` — show this rich menu to every user who has no
 * per-user rich menu of their own linked (`rich-menu-link-to-user` always wins over this).
 *
 * Idempotent: calling it again with the same or a different rich menu ID simply replaces the
 * current default, which is exactly what a retry of this same call should do.
 */
const richMenuSetDefault: ActionDefinition<Input> = {
  key: "rich-menu-set-default",
  type: "perform",
  resource: "rich-menu",
  title: "Set Default Rich Menu",
  description:
    "Show this rich menu to every user with no per-user rich menu of their own linked. Replaces " +
    "any previous default.",
  idempotent: true,
  params: [richMenuIdParam],
  output: [],

  execute(input, ctx) {
    const richMenuId = String(input.richMenuId ?? "").trim();
    if (!richMenuId) throw new Error("`richMenuId` is required");
    ctx.log("info", "setting the default LINE rich menu", { richMenuId });
    return new LineClient(ctx).json(
      `/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`,
      { method: "POST" },
    );
  },
};

export default richMenuSetDefault;
