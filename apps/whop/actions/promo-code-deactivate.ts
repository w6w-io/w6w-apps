import type { ActionDefinition } from "@w6w/types";
import { idempotencyHeaders, WhopClient } from "../lib/client.ts";
import { promoCodeIdParam } from "../lib/params.ts";

/** `POST /promo_codes/{id}/deactivate` — turns an active code off. */
interface Input {
  promoCodeId: string;
}

const promoCodeDeactivate: ActionDefinition<Input> = {
  key: "promo-code-deactivate",
  type: "perform",
  resource: "promo-code",
  title: "Deactivate Promo Code",
  description: "Turn off an active promo code so it can no longer be redeemed at checkout.",
  idempotent: true,
  params: [promoCodeIdParam],
  output: [{ key: "data", type: "object", label: "The deactivated promo code" }],

  execute(input, ctx) {
    return new WhopClient(ctx).post(
      `/promo_codes/${encodeURIComponent(input.promoCodeId)}/deactivate`,
      undefined,
      idempotencyHeaders(ctx)["Idempotency-Key"],
    );
  },
};

export default promoCodeDeactivate;
