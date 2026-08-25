import type { ActionDefinition } from "@w6w/types";
import { compact, jsonObject, SignNowClient } from "../lib/client.ts";

interface Input {
  eventSubscriptionId: string;
  event: string;
  entityId: string;
  callback: string;
  useTls12?: boolean;
  integrationId?: string;
  docIdQueryParam?: boolean;
  headers?: string;
}

/**
 * `PUT /api/v2/events/{event_subscription_id}` — replace an event
 * subscription's event/entity/callback/attributes. SignNow documents this
 * operation as accepting **either** Bearer or Basic auth, so — unlike
 * `GET`/`DELETE` on this same resource, which are Basic-only — it works with
 * this app's per-user bearer `sign` hook.
 */
const eventSubscriptionUpdate: ActionDefinition<Input> = {
  key: "event-subscription-update",
  type: "perform",
  resource: "webhook",
  title: "Update Event Subscription",
  description: "Replace an existing event subscription's event, entity, callback or attributes.",
  idempotent: true,
  params: [
    {
      key: "eventSubscriptionId",
      label: "Event Subscription ID",
      type: "string",
      required: true,
      hint: "From Create Event Subscription's response.",
    },
    { key: "event", label: "Event", type: "string", required: true },
    { key: "entityId", label: "Entity ID", type: "string", required: true },
    { key: "callback", label: "Callback URL", type: "string", required: true },
    { key: "useTls12", label: "Require TLS 1.2", type: "boolean" },
    { key: "integrationId", label: "Integration ID", type: "string", advanced: true },
    {
      key: "docIdQueryParam",
      label: "Append document id as query param",
      type: "boolean",
      advanced: true,
    },
    { key: "headers", label: "Custom headers (JSON object)", type: "json", advanced: true },
  ],
  output: [{ key: "id", type: "string", label: "Event subscription ID" }],

  execute(input, ctx) {
    const headers = jsonObject(input.headers, "headers");
    return new SignNowClient(ctx).request(
      `/api/v2/events/${encodeURIComponent(input.eventSubscriptionId)}`,
      {
        method: "PUT",
        body: {
          event: input.event,
          entity_id: input.entityId,
          action: "callback",
          attributes: compact({
            callback: input.callback,
            use_tls_12: input.useTls12,
            integration_id: input.integrationId,
            docid_queryparam: input.docIdQueryParam,
            headers: Object.keys(headers).length ? headers : undefined,
          }),
        },
      },
    );
  },
};

export default eventSubscriptionUpdate;
