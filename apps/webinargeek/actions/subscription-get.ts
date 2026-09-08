import type { ActionDefinition } from "@w6w/types";
import { WebinarGeekClient } from "../lib/client.ts";

/**
 * `GET /subscriptions/{id}` — a subscriber's full detail, including poll votes, quiz answers,
 * assessment results, payments, and up to 100 of their own messages/questions.
 */
interface Input {
  id: number;
}

const subscriptionGet: ActionDefinition<Input> = {
  key: "subscription-get",
  type: "read",
  resource: "subscription",
  title: "Get Subscription",
  description:
    "Retrieve a specific subscriber, including poll votes, quiz answers, assessment and " +
    "payments. Messages/questions here are capped at 100 — use the dedicated list actions for more.",
  params: [
    { key: "id", label: "Subscription ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Subscription ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "watched", type: "boolean", label: "Watched" },
    { key: "unsubscribed", type: "boolean", label: "Unsubscribed" },
    { key: "assessment", type: "object", label: "Assessment result" },
    { key: "payments", type: "array", label: "Payments" },
    { key: "broadcast", type: "object", label: "Broadcast" },
  ],

  execute(input, ctx) {
    return new WebinarGeekClient(ctx).request(`/subscriptions/${input.id}`);
  },
};

export default subscriptionGet;
