import type { ActionDefinition } from "@w6w/types";
import { type BrexCard, BrexClient, encodeId } from "../lib/client.ts";
import { cardIdParam, idempotencyKeyParam } from "../lib/params.ts";

/**
 * `POST /v2/cards/{id}/unlock` — unlock an existing card.
 *
 * The inverse of `card-lock`, and it takes **no request body at all**: Brex
 * documents only the path id and the optional `Idempotency-Key` header, so this
 * action sends neither a `content-type` nor a body. Sending one is harmless at
 * most and a validation error at worst, which is why the client only sets
 * `content-type: application/json` when there is something to serialize.
 *
 * A terminated card cannot be unlocked — `TERMINATED` is terminal in Brex's own
 * status enum, so only `LOCKED` comes back.
 *
 * Idempotent in effect: a repeat converges on the card being unlocked, though a
 * second call against an already-unlocked card may answer an error rather than a
 * no-op.
 */
interface Input {
  id: string;
  idempotencyKey?: string;
}

const cardUnlock: ActionDefinition<Input> = {
  key: "card-unlock",
  type: "perform",
  resource: "card",
  title: "Unlock Card",
  description: "Unlock a locked Brex card. Sends no request body — Brex documents none.",
  idempotent: true,
  params: [cardIdParam, idempotencyKeyParam],
  output: [
    { key: "id", type: "string", label: "Card id" },
    { key: "owner", type: "object", label: "Card owner" },
    { key: "status", type: "string", label: "Status after the unlock" },
    { key: "last_four", type: "string", label: "Last four digits" },
    { key: "card_name", type: "string", label: "Card name" },
    { key: "card_type", type: "string", label: "Card type" },
    { key: "limit_type", type: "string", label: "Limit type" },
    { key: "spend_controls", type: "object", label: "Spend controls" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexCard>(`/cards/${encodeId(input.id)}/unlock`, {
      method: "POST",
      idempotencyKey: input.idempotencyKey,
    });
  },
};

export default cardUnlock;
