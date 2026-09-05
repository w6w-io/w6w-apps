import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { subscriptionIdParam } from "../lib/params.ts";

interface Input {
  subscriptionId: string;
  cancellationReason: string;
  cancellationReasonComments?: string;
  sendEmail?: boolean;
}

/**
 * `POST /subscriptions/{id}/cancel` — cancel an active subscription. Scope:
 * `write_subscriptions`. Response envelope: `{"subscription": {...}}`.
 *
 * Not marked idempotent: the reference documents no defined behaviour for
 * cancelling an already-cancelled subscription, so a retry after a dropped
 * response is not guaranteed to be a safe no-op.
 */
const subscriptionCancel: ActionDefinition<Input> = {
  key: "subscription-cancel",
  type: "perform",
  resource: "subscription",
  title: "Cancel Subscription",
  description: "Cancel an active subscription.",
  idempotent: false,
  params: [
    subscriptionIdParam,
    { key: "cancellationReason", label: "Cancellation reason", type: "string", required: true },
    {
      key: "cancellationReasonComments",
      label: "Cancellation reason comments",
      type: "text",
      hint: "Maximum 1024 characters.",
    },
    {
      key: "sendEmail",
      label: "Send cancellation email",
      type: "boolean",
      default: true,
      hint: "Set to false to suppress the subscription-cancelled email to the customer and " +
        "store owner.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "cancelled_at", type: "string", label: "Cancelled at" },
    { key: "cancellation_reason", type: "string", label: "Cancellation reason" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}/cancel`,
      "subscription",
      {
        method: "POST",
        body: compact({
          cancellation_reason: input.cancellationReason,
          cancellation_reason_comments: input.cancellationReasonComments,
          send_email: input.sendEmail,
        }),
      },
    );
  },
};

export default subscriptionCancel;
