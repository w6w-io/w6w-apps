import type { ActionDefinition } from "@w6w/types";
import { LineClient } from "../lib/client.ts";
import { richMenuIdParam } from "../lib/params.ts";

interface Input {
  richMenuId: string;
}

/**
 * `DELETE /v2/bot/richmenu/{richMenuId}`.
 *
 * Idempotent: a rich menu's end state after deletion is the same whether this is the first call or
 * a retry of one that actually succeeded but whose response was lost — the only difference is a
 * `404` on the second attempt, which this app treats as a successful no-op end state rather than an
 * error worth failing a retry over.
 */
const richMenuDelete: ActionDefinition<Input> = {
  key: "rich-menu-delete",
  type: "perform",
  resource: "rich-menu",
  title: "Delete Rich Menu",
  description: "Delete a rich menu.",
  idempotent: true,
  params: [richMenuIdParam],
  output: [],

  async execute(input, ctx) {
    const richMenuId = String(input.richMenuId ?? "").trim();
    if (!richMenuId) throw new Error("`richMenuId` is required");
    try {
      await new LineClient(ctx).json(`/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      if (err instanceof Error && /^LINE 404 /.test(err.message)) {
        ctx.log("info", "rich menu already gone", { richMenuId });
        return {};
      }
      throw err;
    }
    return {};
  },
};

export default richMenuDelete;
