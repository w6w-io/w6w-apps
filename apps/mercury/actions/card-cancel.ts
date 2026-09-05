import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `POST /cards/{cardId}/cancel` — permanently cancel a card. Unlike
 * freeze/unfreeze, this is not reversible — Mercury issues a new card rather
 * than un-cancelling one. Still marked idempotent: repeating the call
 * against an already-cancelled card lands on the same end state (cancelled),
 * not a second cancellation.
 */
interface Input {
  cardId: string;
}

const cardCancel: ActionDefinition<Input> = {
  key: "card-cancel",
  type: "perform",
  resource: "card",
  title: "Cancel Card",
  description:
    "Permanently cancel a card. Not reversible — Mercury issues a replacement rather than reinstating this one.",
  idempotent: true,
  params: [cardIdParam],
  output: [{ key: "card", type: "object", label: "Updated card" }],

  async execute(input, ctx) {
    const card = await new MercuryClient(ctx).json(
      `/cards/${encodeURIComponent(input.cardId)}/cancel`,
      { method: "POST" },
    );
    return { card };
  },
};

export default cardCancel;
