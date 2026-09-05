import type { ActionDefinition } from "@w6w/types";
import { encodeId, TapfiliateClient } from "../lib/client.ts";

/** `DELETE /payments/{id}/` — cancels the payment and re-adds the amount to the affiliate's balance. */
interface Input {
  id: string;
}

const paymentCancel: ActionDefinition<Input> = {
  key: "payment-cancel",
  type: "perform",
  resource: "payment",
  title: "Cancel Payment",
  description: "Cancel a payment. The amount is re-added to the affiliate's balance.",
  idempotent: true,
  params: [{
    key: "id",
    label: "Payment",
    type: "string",
    required: true,
    placeholder: "pa_eXampl3",
  }],
  output: [{
    key: "items",
    type: "array",
    label: "Remaining payments, per the vendor's example response",
  }],

  async execute(input, ctx) {
    const items = await new TapfiliateClient(ctx).json(`/payments/${encodeId(input.id)}/`, {
      method: "DELETE",
    });
    return { items: items ?? [] };
  },
};

export default paymentCancel;
