import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `GET /api/v1/cards/{cardId}/extended` — a Card's full content plus its
 * teams and collaborators.
 */
interface Input {
  cardId: string;
}

const cardGet: ActionDefinition<Input> = {
  key: "card-get",
  type: "read",
  resource: "card",
  title: "Get Card",
  description: "Fetch one Card's full content, verification state, tags and collaborators.",
  params: [cardIdParam],
  output: [{ key: "data", type: "object", label: "The Card" }],

  async execute(input, ctx) {
    const card = await new GuruClient(ctx).json<Record<string, unknown>>(
      `/cards/${encodeURIComponent(input.cardId)}/extended`,
    );
    return stripTokens(card);
  },
};

export default cardGet;
