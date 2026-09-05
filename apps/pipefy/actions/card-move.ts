import type { ActionDefinition } from "@w6w/types";
import { gqlInput, PipefyClient } from "../lib/client.ts";

interface Input {
  cardId: string;
  destinationPhaseId: string;
}

/**
 * `moveCardToPhase(input: {card_id, destination_phase_id}) { card {
 * current_phase { id } } }` — from Pipefy's own dedicated "Move Card to a
 * Different Phase" guide.
 *
 * A destination phase not directly reachable from the card's current phase
 * (per that phase's own "Move card settings"), a destination in a
 * different pipe, or a required field left empty on the destination phase
 * all fail as a top-level GraphQL error — `"Card could not be moved to
 * phase id: <id>"` — which `PipefyClient.send` already turns into a thrown
 * error; see Pipefy's own "Receiving Card could not be moved to phase"
 * troubleshooting page for the exact wording.
 */
const buildQuery = (fields: Record<string, unknown>) =>
  `mutation { moveCardToPhase(input: ${
    gqlInput(fields)
  }) { card { id current_phase { id name } } } }`;

const cardMove: ActionDefinition<Input> = {
  key: "card-move",
  type: "perform",
  resource: "card",
  title: "Move Card to Phase",
  description: "Move a card to a different phase of its pipe.",
  idempotent: true,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    { key: "destinationPhaseId", label: "Destination Phase ID", type: "string", required: true },
  ],
  output: [{ key: "card", type: "object", label: "The card's new phase" }],

  async execute(input, ctx) {
    const data = await new PipefyClient(ctx).send<{ moveCardToPhase: { card: unknown } }>(
      buildQuery({ card_id: input.cardId, destination_phase_id: input.destinationPhaseId }),
    );
    return data.moveCardToPhase.card;
  },
};

export default cardMove;
