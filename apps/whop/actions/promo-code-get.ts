import type { ActionDefinition } from "@w6w/types";
import { WhopClient } from "../lib/client.ts";
import { promoCodeIdParam } from "../lib/params.ts";

interface Input {
  promoCodeId: string;
}

const promoCodeGet: ActionDefinition<Input> = {
  key: "promo-code-get",
  type: "read",
  resource: "promo-code",
  title: "Get Promo Code",
  description: "Retrieve a promo code by ID.",
  params: [promoCodeIdParam],
  output: [{ key: "data", type: "object", label: "The promo code" }],

  execute(input, ctx) {
    return new WhopClient(ctx).get(`/promo_codes/${encodeURIComponent(input.promoCodeId)}`);
  },
};

export default promoCodeGet;
