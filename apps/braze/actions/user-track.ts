import type { ActionDefinition } from "@w6w/types";
import { BrazeClient } from "../lib/client.ts";

/**
 * `POST /users/track` — verified against the fetched OpenAPI spec's `User
 * Data` tag. Records custom events, purchases, and attribute updates in one
 * call; at least one of `external_id`, `user_alias`, `braze_id`, `email`, or
 * `phone` is required inside each attribute/event/purchase object (the spec
 * states this as prose, not a JSON Schema constraint, so it is left to the
 * caller rather than enforced here).
 *
 * Braze applies a base rate limit of 3,000 requests / 3 seconds to this
 * endpoint (documented, not surfaced as a response header — see the app
 * README for why `quota` is declared unavailable). Each call may update up to
 * 225 users total across its three arrays.
 */
const action: ActionDefinition = {
  key: "user-track",
  type: "perform",
  resource: "user",
  title: "Track User",
  description: "Record custom events, purchases, and attribute updates for one or more users.",
  // Events and purchases are NOT safe to retry blindly — a retried call
  // records the same purchase/event a second time. Attribute-only updates
  // would be idempotent, but this action covers all three arrays at once.
  idempotent: false,
  params: [
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      hint: "Array of user attribute objects, each identifying its user.",
    },
    {
      key: "events",
      label: "Events",
      type: "json",
      hint: "Array of custom event objects, each identifying its user.",
    },
    {
      key: "purchases",
      label: "Purchases",
      type: "json",
      hint: "Array of purchase objects, each identifying its user.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as { attributes?: unknown; events?: unknown; purchases?: unknown };
    ctx.log("info", "tracking Braze users", {
      attributes: Array.isArray(p.attributes) ? p.attributes.length : 0,
      events: Array.isArray(p.events) ? p.events.length : 0,
      purchases: Array.isArray(p.purchases) ? p.purchases.length : 0,
    });
    return await new BrazeClient(ctx).post("/users/track", {
      attributes: p.attributes ?? undefined,
      events: p.events ?? undefined,
      purchases: p.purchases ?? undefined,
    });
  },
};

export default action;
