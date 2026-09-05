import type { ActionDefinition } from "@w6w/types";
import { gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  cardId: string;
  fieldId: string;
  newValue: string;
}

/**
 * `updateCardField(input: {card_id, field_id, new_value}) { card { fields {
 * value field { label id } } } success }` — Pipefy's own reference example.
 * `new_value` accepts whatever shape the target field's type expects (see
 * the Field Types table linked in `card-create`'s hint) — most take a plain
 * string, a multi-select field takes a comma-separated list of exact
 * option values.
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { updateCardField(input: ${gqlInput(fields)}) {
    success
    card { id fields { name value filled_at field { id } } }
  } }`;

const cardUpdateField: ActionDefinition<Input> = {
  key: "card-update-field",
  type: "perform",
  resource: "card",
  title: "Update Card Field",
  description: "Set a single field's value on a card.",
  idempotent: true,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    { key: "fieldId", label: "Field ID (slug)", type: "string", required: true },
    { key: "newValue", label: "New value", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Whether the update succeeded" },
    { key: "card", type: "object", label: "The card's field values" },
  ],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<
      { updateCardField: { success: boolean; card: unknown } }
    >(
      buildQuery({ card_id: input.cardId, field_id: input.fieldId, new_value: input.newValue }),
    );
    return data.updateCardField;
  },
};

export default cardUpdateField;
