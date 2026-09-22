import type { ActionDefinition } from "@w6w/types";
import { type BrexCard, BrexClient, compact, encodeId } from "../lib/client.ts";
import { cardIdParam, cardReasonOptions, idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/cards/{id}/terminate` — terminate a card, permanently.
 *
 * Same required `reason` enum and optional `description` as locking, and Brex
 * notifies the card owner. The difference is the state reached: Brex's card
 * status enum is `ACTIVE | SHIPPED | LOCKED | TERMINATED`, and nothing unlocks or
 * restores a terminated card. Prefer `card-lock` unless the card is really being
 * retired — reissuing is a separate, dashboard-side process.
 *
 * Idempotent in effect — the target state is `TERMINATED` either way — with the
 * same caveat as locking: a repeat may answer an error rather than a no-op, and
 * that surfaces rather than being swallowed.
 */
interface Input {
  id: string;
  reason: string;
  description?: string;
  idempotencyKey?: string;
}

const cardTerminate: ActionDefinition<Input> = {
  key: "card-terminate",
  type: "perform",
  resource: "card",
  title: "Terminate Card",
  description:
    "Permanently terminate a Brex card. Not reversible — prefer Lock Card unless the card is " +
    "being retired. Brex notifies the card owner.",
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
      hint: "Optional free text for terminating the card.",
    },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Card id" },
    { key: "owner", type: "object", label: "Card owner" },
    { key: "status", type: "string", label: "Status — TERMINATED after a successful call" },
    { key: "last_four", type: "string", label: "Last four digits" },
    { key: "card_name", type: "string", label: "Card name" },
    { key: "card_type", type: "string", label: "Card type" },
    { key: "limit_type", type: "string", label: "Limit type" },
    { key: "spend_controls", type: "object", label: "Spend controls" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexCard>(`/cards/${encodeId(input.id)}/terminate`, {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
      body: compact({ reason: input.reason, description: input.description }),
    });
  },
};

export default cardTerminate;
