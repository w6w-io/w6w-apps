import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /email/status` — verified against the fetched spec. Sets an email
 * address's subscription state directly. Idempotent: setting the same state
 * twice leaves the address in the same state.
 */
const action: ActionDefinition = {
  key: "email-status-set",
  type: "perform",
  resource: "email",
  title: "Set Email Subscription Status",
  description: "Subscribe, unsubscribe, or opt an email address out of subscribed messaging.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Braze also accepts an array of up to 50 addresses on the wire; this action passes " +
        "through a single address.",
    },
    {
      key: "subscriptionState",
      label: "Subscription State",
      type: "select",
      required: true,
      options: [
        { value: "subscribed", label: "Subscribed" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "opted_in", label: "Opted In" },
      ],
    },
  ],
  output: [
    { key: "message", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as { email: string; subscriptionState: string };
    ctx.log("info", "setting Braze email subscription status", {
      subscriptionState: p.subscriptionState,
    });
    return await new BrazeClient(ctx).post("/email/status", {
      email: p.email,
      subscription_state: p.subscriptionState,
    });
  },
};

export default action;
