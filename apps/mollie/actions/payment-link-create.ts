import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { amountFrom, amountParams, profileIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `POST /v2/payment-links` — create a reusable, shareable checkout URL.
 * `description` is the only required field; `amount` may be omitted
 * entirely, in which case the customer is prompted to enter one.
 */
interface Input {
  description: string;
  amountValue?: string;
  amountCurrency?: string;
  redirectUrl?: string;
  webhookUrl?: string;
  profileId?: string;
  testmode?: boolean;
}

const paymentLinkCreate: ActionDefinition<Input> = {
  key: "payment-link-create",
  type: "perform",
  resource: "payment-link",
  title: "Create Payment Link",
  description:
    "Create a reusable, shareable checkout link. Omit amount to let the customer enter one.",
  idempotent: false,
  params: [
    {
      key: "description",
      label: "Description",
      type: "string",
      required: true,
      hint: "Max 255 characters.",
    },
    ...amountParams("amount", "Amount", false),
    { key: "redirectUrl", label: "Redirect URL", type: "string", advanced: true },
    { key: "webhookUrl", label: "Webhook URL", type: "string", advanced: true },
    profileIdParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment Link ID (pl_*)" },
    {
      key: "_links",
      type: "object",
      label: "Links (_links.paymentLink.href is the shareable URL — not self.href)",
    },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      "/payment-links",
      compact({
        description: input.description,
        amount: amountFrom(input, "amount"),
        redirectUrl: input.redirectUrl,
        webhookUrl: input.webhookUrl,
        profileId: input.profileId,
        testmode: input.testmode,
      }),
    );
  },
};

export default paymentLinkCreate;
