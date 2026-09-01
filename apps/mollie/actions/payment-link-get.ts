import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { paymentLinkIdParam, testmodeParam } from "../lib/params.ts";

interface Input {
  paymentLinkId: string;
  testmode?: boolean;
}

const paymentLinkGet: ActionDefinition<Input> = {
  key: "payment-link-get",
  type: "read",
  resource: "payment-link",
  title: "Get Payment Link",
  description: "Retrieve a single payment link by ID.",
  params: [paymentLinkIdParam(), testmodeParam],
  output: [
    { key: "id", type: "string", label: "Payment Link ID" },
    { key: "description", type: "string", label: "Description" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).get(
      `/payment-links/${encodeURIComponent(input.paymentLinkId)}`,
      compact({ testmode: input.testmode }),
    );
  },
};

export default paymentLinkGet;
