import type { ActionDefinition } from "@w6w/types";
import { type BrexCard, BrexClient, compact, encodeId } from "../lib/client.ts";
import { cardIdParam, cardReasonOptions, idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/cards/{id}/lock` — lock an existing, unlocked card.
 *
 * "And the card owner will receive a notification about it", per Brex — so this
 * is not a silent state change. The `reason` is required and comes from a fixed
 * seven-value enum; `description` is optional free text.
 *
 * Locking is reversible with `card-unlock`, which is why it is the right verb for
 * a suspected-lost card: `card-terminate` is not reversible.
 *
 * ## Idempotent, with a caveat worth stating
 *
 * The target state is `LOCKED` and a repeat converges on it, so a retry after a
 * dropped connection is safe in effect. Brex's wording ("locks an existing,
 * unlocked card") means a second call may answer an error instead of a no-op;
 * that surfaces as a message rather than being swallowed, which is the better
 * failure for a workflow to see.
 */
interface Input {
  id: string;
  reason: string;
  description?: string;
  idempotencyKey?: string;
}

const cardLock: ActionDefinition<Input> = {
  key: "card-lock",
  type: "perform",
  resource: "card",
  title: "Lock Card",
  description: "Lock a Brex card. Reversible with Unlock Card. Brex notifies the card owner.",
  idempotent: true,
  params: [
    cardIdParam,
    {
      key: "reason",
      label: "Reason",
      type: "select",
      options: cardReasonOptions,
      required: true,
      hint: "Required by Brex, and shown to the card owner in the notification.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      hint: "Optional free text for locking the card.",
    },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Card id" },
    { key: "owner", type: "object", label: "Card owner" },
    { key: "status", type: "string", label: "Status — LOCKED after a successful lock" },
    { key: "last_four", type: "string", label: "Last four digits" },
    { key: "card_name", type: "string", label: "Card name" },
    { key: "card_type", type: "string", label: "Card type" },
    { key: "limit_type", type: "string", label: "Limit type" },
    { key: "spend_controls", type: "object", label: "Spend controls" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexCard>(`/cards/${encodeId(input.id)}/lock`, {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: compact({ reason: input.reason, description: input.description }),
    });
  },
};

export default cardLock;
