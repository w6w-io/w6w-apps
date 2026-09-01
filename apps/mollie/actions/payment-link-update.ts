import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentLinkIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentLinkId: string;
  description?: string;
  archived?: boolean;
  redirectUrl?: string;
  testmode?: boolean;
}

const paymentLinkUpdate: ActionDefinition<Input> = {
  key: "payment-link-update",
  type: "perform",
  resource: "payment-link",
  title: "Update Payment Link",
  description: "Update a payment link's description, archived state, or redirect URL.",
  idempotent: true,
  params: [
    paymentLinkIdParam(),
    { key: "description", label: "Description", type: "string" },
    {
      key: "archived",
      label: "Archived",
      type: "boolean",
      hint: "Archive to stop accepting new payments on this link.",
    },
    { key: "redirectUrl", label: "Redirect URL", type: "string", advanced: true },
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment Link ID" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).patch(
      `/payment-links/${encodeURIComponent(input.paymentLinkId)}`,
      compact({
        description: input.description,
        archived: input.archived,
        redirectUrl: input.redirectUrl,
        testmode: input.testmode,
      }),
    );
  },
};

export default paymentLinkUpdate;
