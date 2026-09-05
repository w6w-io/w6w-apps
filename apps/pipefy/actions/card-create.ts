import type { ActionDefinition } from "@w6w/types";
import { CARD_FIELDS, gqlInput, jsonArrayArg, PipefyClient } from "../lib/client.ts";

interface Input {
  pipeId: string;
  title: string;
  fields?: unknown;
}

/**
 * `createCard(input: {pipe_id, title, fields_attributes: [{field_id,
 * field_value}]}) { card { ... } }` — Pipefy's own reference example.
 * `field_value` accepts a plain string for most field types, or an array of
 * strings for a multi-select field (`checklist_horizontal`/`_vertical`,
 * `assignee_select`, `label_select`, `connector`) per the Fields doc's
 * "Field Types" table.
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { createCard(input: ${gqlInput(fields)}) { card { ${CARD_FIELDS} } } }`;

const cardCreate: ActionDefinition<Input> = {
  key: "card-create",
  type: "perform",
  resource: "card",
  title: "Create Card",
  description: "Create a card in a pipe, optionally filling in start-form fields.",
  idempotent: false,
  params: [
    { key: "pipeId", label: "Pipe ID", type: "string", required: true },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "fields",
      label: "Field values",
      type: "json",
      hint: 'Array of { "field_id": "...", "field_value": "..." } pairs. Find field ids via ' +
        "Pipe/Phase's start-form fields.",
    },
  ],
  output: [{ key: "card", type: "object", label: "The created card" }],

  async execute(input, ctx) {
    const fields_attributes = jsonArrayArg(input.fields, "fields");
    const data = await new PipefyClient(ctx).send<{ createCard: { card: unknown } }>(
      buildQuery({ pipe_id: input.pipeId, title: input.title, fields_attributes }),
    );
    return data.createCard.card;
  },
};

export default cardCreate;
