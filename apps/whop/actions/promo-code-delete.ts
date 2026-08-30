import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { promoCodeIdParam } from "../lib/params.ts";

/** `DELETE /promo_codes/{id}` — archives it; it can no longer be used at checkout. */
interface Input {
  promoCodeId: string;
}

const promoCodeDelete: ActionDefinition<Input> = {
  key: "promo-code-delete",
  type: "perform",
  resource: "promo-code",
  title: "Delete Promo Code",
  description: "Archive a promo code so it can no longer be used at checkout.",
  idempotent: true,
  params: [promoCodeIdParam],
  output: [
    { key: "id", type: "string", label: "Deleted promo code ID" },
    { key: "deleted", type: "boolean", label: "Always true" },
  ],

  execute(input, ctx) {
    return new WhopClient(ctx).delete(`/promo_codes/${encodeURIComponent(input.promoCodeId)}`);
  },
};

export default promoCodeDelete;
