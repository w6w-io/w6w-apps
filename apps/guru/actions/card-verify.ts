import type { ActionDefinition } from "@w6w/types";
import { GuruClient } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `PUT /api/v1/cards/{cardId}/verify` — mark a Card as verified (TRUSTED),
 * resetting its verification interval from today. Answers `204` with no body
 * on success. Guru restricts this to the Card's own verifier(s); a 403 here
 * means the connected credential is not one of them.
 *
 * Requires a **User token**.
 */
interface Input {
  cardId: string;
}

const cardVerify: ActionDefinition<Input> = {
  key: "card-verify",
  type: "perform",
  resource: "card",
  title: "Verify Card",
  description: "Mark a Card as verified. Only the Card's own verifier(s) may do this.",
  idempotent: true,
  params: [cardIdParam],
  output: [{ key: "verified", type: "boolean", label: "Whether verification succeeded" }],

  async execute(input, ctx) {
    await new GuruClient(ctx).json(`/cards/${encodeURIComponent(input.cardId)}/verify`, {
      method: "PUT",
    });
    return { verified: true };
  },
};

export default cardVerify;
