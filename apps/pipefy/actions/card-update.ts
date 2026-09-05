import type { ActionDefinition } from "@w6w/types";
import { CARD_FIELDS, gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
  title: string;
}

/**
 * `updateCard(input: {id, title}) { card { ... } }` — Pipefy's own
 * reference example. `title` is the only field-level argument this app
 * confirmed for `updateCard` itself; to change a specific field's value use
 * `card-update-field`, and to move phases use `card-move`.
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { updateCard(input: ${gqlInput(fields)}) { card { ${CARD_FIELDS} } } }`;

const cardUpdate: ActionDefinition<Input> = {
  key: "card-update",
  type: "perform",
  resource: "card",
  title: "Update Card Title",
  description: "Rename a card.",
  idempotent: true,
  params: [
    { key: "id", label: "Card ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
  ],
  output: [{ key: "card", type: "object", label: "The updated card" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ updateCard: { card: unknown } }>(
      buildQuery({ id: input.id, title: input.title }),
    );
    return data.updateCard.card;
  },
};

export default cardUpdate;
