import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/** `POST /cards/{cardId}/unfreeze` — the inverse of card-freeze. No request body. */
interface Input {
  cardId: string;
}

const cardUnfreeze: ActionDefinition<Input> = {
  key: "card-unfreeze",
  type: "perform",
  resource: "card",
  title: "Unfreeze Card",
  description: "Unfreeze a previously frozen card, restoring its ability to transact.",
  idempotent: true,
  params: [cardIdParam],
  output: [{ key: "card", type: "object", label: "Updated card" }],

  async execute(input, ctx) {
    const card = await new MercuryClient(ctx).json(
      `/cards/${encodeURIComponent(input.cardId)}/unfreeze`,
      { method: "POST" },
    );
    return { card };
  },
};

export default cardUnfreeze;
