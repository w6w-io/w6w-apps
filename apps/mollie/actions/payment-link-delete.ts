import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentLinkIdParam, testmodeParam } from "../lib/params.ts";

/** `DELETE /v2/payment-links/{id}` — permanently remove a payment link. */
interface Input {
  paymentLinkId: string;
  testmode?: boolean;
}

const paymentLinkDelete: ActionDefinition<Input> = {
  key: "payment-link-delete",
  type: "perform",
  resource: "payment-link",
  title: "Delete Payment Link",
  description: "Permanently delete a payment link. This cannot be undone.",
  idempotent: true,
  params: [paymentLinkIdParam(), testmodeParam],
  output: [
    { key: "paymentLinkId", type: "string", label: "Payment Link ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new MollieClient(ctx).delete(
      `/payment-links/${encodeURIComponent(input.paymentLinkId)}`,
      compact({ testmode: input.testmode }),
    );
    return { paymentLinkId: input.paymentLinkId, deleted: true };
  },
};

export default paymentLinkDelete;
