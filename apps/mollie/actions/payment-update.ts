import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { asOptionalJson, metadataParam, paymentIdParam, testmodeParam } from "../lib/params.ts";

/** `PATCH /v2/payments/{id}` — update a payment while it is still open. */
interface Input {
  paymentId: string;
  description?: string;
  redirectUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  method?: string;
  metadata?: unknown;
  testmode?: boolean;
}

const paymentUpdate: ActionDefinition<Input> = {
  key: "payment-update",
  type: "perform",
  resource: "payment",
  title: "Update Payment",
  description: "Update select fields of a payment (only while it is still `open`).",
  idempotent: true,
  params: [
    paymentIdParam(),
    { key: "description", label: "Description", type: "string" },
    { key: "redirectUrl", label: "Redirect URL", type: "string" },
    { key: "cancelUrl", label: "Cancel URL", type: "string", advanced: true },
    { key: "webhookUrl", label: "Webhook URL", type: "string", advanced: true },
    { key: "method", label: "Method", type: "string", advanced: true },
    metadataParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).patch(
      `/payments/${encodeURIComponent(input.paymentId)}`,
      compact({
        description: input.description,
        redirectUrl: input.redirectUrl,
        cancelUrl: input.cancelUrl,
        webhookUrl: input.webhookUrl,
        method: input.method,
        metadata: asOptionalJson(input.metadata, "metadata"),
        testmode: input.testmode,
      }),
    );
  },
};

export default paymentUpdate;
