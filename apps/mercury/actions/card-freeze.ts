import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `POST /cards/{cardId}/freeze` — freeze a card, blocking new transactions.
 * No request body. Marked idempotent: freezing an already-frozen card is a
 * state assignment, not an additive side effect — a retry lands on the same
 * end state rather than compounding.
 */
interface Input {
  cardId: string;
}

const cardFreeze: ActionDefinition<Input> = {
  key: "card-freeze",
  type: "perform",
  resource: "card",
  title: "Freeze Card",
  description:
    "Freeze a card, blocking new transactions. A common automated response to suspected fraud.",
  idempotent: true,
  params: [cardIdParam],
  output: [{ key: "card", type: "object", label: "Updated card" }],

  async execute(input, ctx) {
    const card = await new MercuryClient(ctx).json(
      `/cards/${encodeURIComponent(input.cardId)}/freeze`,
      { method: "POST" },
    );
    return { card };
  },
};

export default cardFreeze;
