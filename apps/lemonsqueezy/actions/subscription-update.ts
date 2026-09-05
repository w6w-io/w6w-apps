import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient } from "../lib/client.ts";
import { pauseModeOptions } from "../lib/params.ts";

/**
 * `PATCH /v1/subscriptions/:id`.
 *
 * Changing `variantId` prorates the next invoice by default — the vendor's
 * own worked example: buy at $50, upgrade mid-cycle to $100, and the next
 * invoice is $125 ($100 renewal + $50 used time on the new plan - $25 credit
 * for unused time on the old one). Set `disableProrations` to charge the new
 * price only at the next renewal, or `invoiceImmediately` to bill the
 * proration right away instead of waiting for the next cycle.
 *
 * **PayPal subscriptions are not modified by this endpoint at all** — the
 * vendor's own note: for PayPal-collected subscriptions, this call succeeds
 * but changes nothing, and the response's
 * `data.attributes.urls.customer_portal_update_subscription` is where the
 * customer must be redirected instead.
 */
interface Input {
  subscriptionId: string;
  variantId?: string;
  pauseMode?: string;
  pauseResumesAt?: string;
  unpause?: boolean;
  cancelled?: boolean;
  trialEndsAt?: string;
  billingAnchor?: number;
  invoiceImmediately?: boolean;
  disableProrations?: boolean;
}

const subscriptionUpdate: ActionDefinition<Input> = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update Subscription",
  description: "Change plan, pause/unpause, cancel/resume, or adjust billing timing. Ignored " +
    "for PayPal-collected subscriptions — see the Customer Portal redirect note.",
  idempotent: true,
  params: [
    { key: "subscriptionId", label: "Subscription ID", type: "string", required: true },
    {
      key: "variantId",
      label: "New variant ID",
      type: "string",
      hint: "Switch this subscription to a different variant (upgrade/downgrade).",
    },
    { key: "pauseMode", label: "Pause mode", type: "select", options: pauseModeOptions },
    {
      key: "pauseResumesAt",
      label: "Pause resumes at",
      type: "datetime",
      hint: "When payment collection should resume. Leave blank to pause indefinitely.",
      dependsOn: ["pauseMode"],
    },
    {
      key: "unpause",
      label: "Unpause",
      type: "boolean",
      hint: "Set the pause object to null, resuming payment collection now.",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      type: "boolean",
      hint: "true schedules cancellation; false resumes a subscription before its `ends_at` date.",
    },
    { key: "trialEndsAt", label: "Trial ends at", type: "datetime" },
    {
      key: "billingAnchor",
      label: "Billing anchor (day of month)",
      type: "number",
      validation: { integer: true, min: 0, max: 31 },
      hint: "1-31 sets the day payments are collected. 0 resets to today's date and removes an " +
        "active trial.",
    },
    {
      key: "invoiceImmediately",
      label: "Invoice immediately",
      type: "boolean",
      hint: "Charge any proration right away instead of at the next renewal. Overridden by " +
        "Disable prorations.",
    },
    {
      key: "disableProrations",
      label: "Disable prorations",
      type: "boolean",
      hint: "Charge the new price only at the next renewal, with no proration.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated Subscription object" }],

  execute(input, ctx) {
    const pause = input.unpause ? null : input.pauseMode
      ? {
        mode: input.pauseMode,
        ...(input.pauseResumesAt ? { resumes_at: input.pauseResumesAt } : {}),
      }
      : undefined;

    return new LemonSqueezyClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
      {
        method: "PATCH",
        body: jsonApiBody(
          "subscriptions",
          {
            variant_id: input.variantId,
            pause,
            cancelled: input.cancelled,
            trial_ends_at: input.trialEndsAt,
            billing_anchor: input.billingAnchor,
            invoice_immediately: input.invoiceImmediately,
            disable_prorations: input.disableProrations,
          },
          undefined,
          input.subscriptionId,
        ),
      },
    );
  },
};

export default subscriptionUpdate;
