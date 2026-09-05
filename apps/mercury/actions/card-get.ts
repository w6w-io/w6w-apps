import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/** `GET /cards/{cardId}` — a single card by ID. */
interface Input {
  cardId: string;
}

const cardGet: ActionDefinition<Input> = {
  key: "card-get",
  type: "read",
  resource: "card",
  title: "Get Card",
  description: "Retrieve a single card by ID.",
  params: [cardIdParam],
  output: [{ key: "card", type: "object", label: "Card" }],

  async execute(input, ctx) {
    const card = await new MercuryClient(ctx).json(`/cards/${encodeURIComponent(input.cardId)}`);
    return { card };
  },
};

export default cardGet;
