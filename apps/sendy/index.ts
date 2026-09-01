/**
 * Sendy — self-hosted newsletter software, sending through the operator's own
 * Amazon SES account.
 *
 * Every path, parameter and documented response was taken from Sendy's own
 * API reference at https://sendy.co/api (fetched 2026-09-01, page states
 * "currently version 7.1.4") — the vendor publishes no OpenAPI/Swagger
 * document, so each endpoint below was verified against that page directly,
 * line by line.
 *
 * ## There is no vendor host
 *
 * Sendy is self-hosted by design: `sendy.co` is the vendor's marketing site
 * and license portal, not an API host. Every call in this app targets the
 * connection's own installation, so the base URL — including any
 * subdirectory an operator installed it under — is a connection field and
 * the egress allowlist is `["*"]`, the posture this pack already uses for
 * `gitea`, `ghost`, `grafana` and `jenkins`.
 *
 * ## The API key lives in the POST body, and status codes lie
 *
 * Sendy's API is "based on simple HTTP POST": every endpoint is a form-
 * urlencoded `POST`, the key travels as an `api_key` field rather than a
 * header, and — verified against the docs — **every one of these calls
 * answers HTTP 200 whether it succeeded or not**. The response body's exact
 * text is the only signal there is, so every action here classifies success
 * against Sendy's own documented literal(s) for that endpoint rather than
 * the status code.
 *
 * ## `unsubscribe` alone needs no API key
 *
 * Sendy's own parameter list for `/unsubscribe` omits `api_key` entirely —
 * every other endpoint requires it. This action still runs through a
 * Connection so the installation URL is known; `sign` still stamps
 * `api_key` onto the body as it does for every request, and Sendy ignores
 * the unused field.
 *
 * ## Left out
 *
 * Sendy also documents a "boolean" honeypot-adjacent `hp` field on
 * `/subscribe`, meant for a public HTML signup form to catch spambots — it
 * has no meaning for a server-to-server workflow call and is not exposed.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import subscriberSubscribe from "./actions/subscriber-subscribe.ts";
import subscriberUnsubscribe from "./actions/subscriber-unsubscribe.ts";
import subscriberDelete from "./actions/subscriber-delete.ts";
import subscriberStatus from "./actions/subscriber-status.ts";
import subscriberActiveCount from "./actions/subscriber-active-count.ts";
import listList from "./actions/list-list.ts";
import brandList from "./actions/brand-list.ts";
import campaignCreate from "./actions/campaign-create.ts";

import service from "./health/service.ts";
import site from "./health/site.ts";

export default {
  actions: [
    // subscribers
    subscriberSubscribe,
    subscriberUnsubscribe,
    subscriberDelete,
    subscriberStatus,
    subscriberActiveCount,
    // lists & brands
    listList,
    brandList,
    // campaigns
    campaignCreate,
  ],
  auth: [apiKey],
  healthChecks: [service, site],
} satisfies AppDefinition;
