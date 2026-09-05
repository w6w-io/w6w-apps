import type { ActionDefinition } from "@w6w/types";
import { CARD_FIELDS, gqlLiteral, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `{ card(id) { ...CARD_FIELDS } }` — Pipefy's own "Objects Within Cards" example. */
const buildQuery = (id: string) => `{ card(id: ${gqlLiteral(id)}) { ${CARD_FIELDS} } }`;

const cardGet: ActionDefinition<Input> = {
  key: "card-get",
  type: "read",
  resource: "card",
  title: "Get Card",
  description: "Get a card by ID, including its field values, phase, pipe and assignees.",
  params: [
    { key: "id", label: "Card ID", type: "string", required: true },
  ],
  output: [{ key: "card", type: "object", label: "The card" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ card: unknown }>(buildQuery(input.id));
    return data.card;
  },
};

export default cardGet;
