import type { ActionDefinition } from "@w6w/types";
import { expectSuccess, gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `deleteCard(input: {id}) { success }` — Pipefy's own reference example. */
const buildQuery = (id: string) =>
  `mutation { deleteCard(input: ${gqlInput({ id })}) { success } }`;

const cardDelete: ActionDefinition<Input> = {
  key: "card-delete",
  type: "perform",
  resource: "card",
  title: "Delete Card",
  description: "Permanently delete a card.",
  idempotent: true,
  params: [
    { key: "id", label: "Card ID", type: "string", required: true },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the card was deleted" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<Record<string, unknown>>(
      buildQuery(input.id),
    );
    const { success } = expectSuccess<{ success: boolean }>(data, "deleteCard");
    return { success };
  },
};

export default cardDelete;
