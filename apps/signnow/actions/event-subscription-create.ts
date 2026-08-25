import type { ActionDefinition } from "@w6w/types";
import { compact, jsonObject, SignNowClient } from "../lib/client.ts";

interface Input {
  event: string;
  entityId: string;
  callback: string;
  useTls12?: boolean;
  integrationId?: string;
  docIdQueryParam?: boolean;
  headers?: string;
}

/**
 * `POST /api/v2/events` — subscribe a callback URL ("Webhooks 2.0") to a
 * document or user event. This is the only Webhooks 2.0 operation this app
 * exposes for **listing/deleting** — see `README.md` for why.
 *
 * `entity_id` is either a document id (for `document.*` events, e.g.
 * `document.open`, `document.update`, `document.complete`) or a user id (for
 * `user.*` events, e.g. `user.document.create`) — which one depends on the
 * chosen `event` name's prefix, per SignNow's own documentation.
 */
const eventSubscriptionCreate: ActionDefinition<Input> = {
  key: "event-subscription-create",
  type: "perform",
  resource: "webhook",
  title: "Create Event Subscription",
  description:
    "Subscribe a callback URL to a document or user event (Webhooks 2.0). `entity_id` is a " +
    "document id for a `document.*` event, or a user id for a `user.*` event.",
  idempotent: false,
  output: [
    {
      key: "created",
      type: "boolean",
      label: "Whether the subscription was created — SignNow answers 204 with no body",
    },
  ],
  params: [
    {
      key: "event",
      label: "Event",
      type: "string",
      required: true,
      hint: "e.g. document.create, document.update, document.complete, user.document.create.",
    },
    {
      key: "entityId",
      label: "Entity ID",
      type: "string",
      required: true,
      hint: "A document id for a document.* event, or a user id for a user.* event.",
    },
    {
      key: "callback",
      label: "Callback URL",
      type: "string",
      required: true,
      hint: "The URL SignNow POSTs the event payload to.",
    },
    {
      key: "useTls12",
      label: "Require TLS 1.2",
      type: "boolean",
      hint: "If true, SignNow uses TLS 1.2 to reach the callback URL.",
    },
    {
      key: "integrationId",
      label: "Integration ID",
      type: "string",
      advanced: true,
      hint: "Optional identifier of an external system, stored alongside the subscription.",
    },
    {
      key: "docIdQueryParam",
      label: "Append document id as query param",
      type: "boolean",
      advanced: true,
      hint: "If true, the callback URL receives the document id as a query string parameter too.",
    },
    {
      key: "headers",
      label: "Custom headers (JSON object)",
      type: "json",
      advanced: true,
      hint: 'e.g. {"string_head":"test","int_head":12,"bool_head":false}',
    },
  ],

  async execute(input, ctx) {
    const headers = jsonObject(input.headers, "headers");
    // SignNow answers 204 with no body on success (verified against the
    // OpenAPI contract's `responses.204`), so there is nothing to return but
    // a confirmation — `SignNowClient.request` would otherwise resolve to
    // `undefined` and leave a workflow with no output to branch on.
    await new SignNowClient(ctx).request("/api/v2/events", {
      method: "POST",
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
    });
    return { created: true };
  },
};

export default eventSubscriptionCreate;
