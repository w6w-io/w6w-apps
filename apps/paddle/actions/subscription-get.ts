import type { ActionDefinition } from "@w6w/types";
import { PaddleClient, toList } from "../lib/client.ts";

/**
 * `GET /subscriptions/{subscription_id}` — one subscription.
 *
 * The two `include` values answer two different questions and are easy to
 * confuse:
 *
 *  - `next_transaction` — what the customer will actually be billed next,
 *    including any prorated or one-time charges not yet invoiced.
 *  - `recurring_transaction_details` — what they are billed in a *normal*
 *    period, with none of that.
 *
 * Reaching for the first when you mean the second is how a dunning email quotes
 * a one-off proration as if it were the monthly price.
 */
interface Input {
  subscriptionId: string;
  include?: string[] | string;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description: "Fetch a subscription, optionally with a preview of its next or recurring charge.",
  params: [
    {
      key: "subscriptionId",
      label: "Subscription ID",
      type: "string",
      required: true,
      placeholder: "sub_01h04vsc0qhwtsbsxh3422wjr5",
      validation: { pattern: "^sub_[a-z0-9]{26}$" },
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        {
          value: "next_transaction",
          label: "Next transaction — what is actually billed next, prorations included",
        },
        {
          value: "recurring_transaction_details",
          label: "Recurring transaction details — a normal period, no one-off charges",
        },
      ],
    },
  ],
  output: [{ key: "data", type: "object", label: "Subscription" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request(
      `/subscriptions/${encodeURIComponent(input.subscriptionId)}`,
      { query: { include: toList(input.include) } },
    );
  },
};

export default subscriptionGet;
