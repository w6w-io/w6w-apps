import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { promoCodeIdParam } from "../lib/params.ts";

/** `POST /promo_codes/{id}/activate` — turns an inactive code back on. */
interface Input {
  promoCodeId: string;
}

const promoCodeActivate: ActionDefinition<Input> = {
  key: "promo-code-activate",
  type: "perform",
  resource: "promo-code",
  title: "Activate Promo Code",
  description: "Turn an inactive promo code back on so it can be redeemed at checkout.",
  idempotent: true,
  params: [promoCodeIdParam],
  output: [{ key: "data", type: "object", label: "The activated promo code" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      `/promo_codes/${encodeURIComponent(input.promoCodeId)}/activate`,
      undefined,
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default promoCodeActivate;
