import type { ActionDefinition } from "@w6w/types";
import { RazorpayClient } from "../lib/client.ts";
import { paymentLinkIdParam } from "../lib/params.ts";

/**
 * `POST /v1/payment_links/{id}/cancel` — cancel a payment link.
 *
 * Only links in `created` status can be cancelled — a paid, partially paid,
 * or already-expired link cannot be.
 */
interface Input {
  id: string;
}

const paymentLinkCancel: ActionDefinition<Input> = {
  key: "payment-link-cancel",
  type: "perform",
  resource: "payment-link",
  title: "Cancel Payment Link",
  description:
    "Cancel a payment link. Only links still in 'created' status can be cancelled — paid, " +
    "partially paid and already-expired links cannot be.",
  idempotent: true,
  params: [paymentLinkIdParam()],
  output: [
    { key: "id", type: "string", label: "Payment Link ID" },
    { key: "status", type: "string", label: "Now 'cancelled' on success" },
  ],

  async execute(input, ctx) {
    return await new RazorpayClient(ctx).post(
      `/payment_links/${encodeURIComponent(input.id)}/cancel`,
    );
  },
};

export default paymentLinkCancel;
