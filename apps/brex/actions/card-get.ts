import type { ActionDefinition } from "@w6w/types";
import { type BrexCard, BrexClient, encodeId } from "../lib/client.ts";
import { cardIdParam } from "../lib/params.ts";

/**
 * `GET /v2/cards/{id}` — one card by id.
 *
 * The full card object, minus the PAN, CVV and expiration date: those live on
 * `GET /v2/cards/{id}/pan`, which this app deliberately does not implement (see
 * the README's "not covered" section).
 */
interface Input {
  id: string;
}

const cardGet: ActionDefinition<Input> = {
  key: "card-get",
  type: "read",
  resource: "card",
  title: "Get Card",
  description: "Fetch one Brex card by id, including its status and spend controls.",
  params: [cardIdParam],
  output: [
    { key: "id", type: "string", label: "Card id" },
    { key: "owner", type: "object", label: "Card owner" },
    { key: "status", type: "string", label: "Status — ACTIVE, SHIPPED, LOCKED or TERMINATED" },
    { key: "last_four", type: "string", label: "Last four digits" },
    { key: "card_name", type: "string", label: "Card name" },
    { key: "card_type", type: "string", label: "Card type — VIRTUAL or PHYSICAL" },
    { key: "limit_type", type: "string", label: "Limit type — CARD or USER" },
    { key: "spend_controls", type: "object", label: "Spend controls, only when limit_type = CARD" },
    { key: "billing_address", type: "object", label: "Billing address" },
    { key: "mailing_address", type: "object", label: "Mailing address" },
    { key: "expiration_date", type: "object", label: "Expiration date" },
    { key: "has_been_transferred", type: "boolean", label: "Whether the card was transferred" },
    { key: "metadata", type: "object", label: "Metadata" },
    { key: "budget_id", type: "string", label: "Budget id" },
    { key: "partner", type: "string", label: "Partner" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexCard>(`/cards/${encodeId(input.id)}`);
  },
};

export default cardGet;
