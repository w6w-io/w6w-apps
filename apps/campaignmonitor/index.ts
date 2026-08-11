/**
 * Campaign Monitor — email marketing on the Campaign Monitor API v3.3
 * (`api.createsend.com`): manage clients and their subscriber lists, add and
 * import subscribers, build and send campaigns, read campaign reporting, and
 * send transactional email.
 *
 * Every path, verb, query parameter, body field, enum and error code in this app
 * was verified on 2026-08-11 against Campaign Monitor's own reference under
 * `www.campaignmonitor.com/api/v3-3/` (eleven section pages; `getting-started/`
 * is 197,122 B and the ten resource pages 158,750–307,327 B) plus live probes of
 * `api.createsend.com`. Nothing came from a third-party integration directory.
 *
 * ## The scoping model, because it decides which actions you can call
 *
 * Campaign Monitor nests **account → client → list → subscriber**, and "client"
 * is its word for a sub-account. An agency account holds many; a direct customer
 * holds exactly one. Lists, campaigns, templates, segments, journeys, tags and
 * the suppression list all belong to a **client**, not to the account. So the
 * actions split three ways, and each one's doc comment says which it is:
 *
 *  - **Account-level** — no id in the path. `client-list`,
 *    `billing-details-get`, `system-date-get`.
 *  - **Client-level** — `{clientid}` in the path. Everything under `/clients/…`,
 *    plus `list-create` and `campaign-create`, whose path id is the *client*
 *    even though they create something else.
 *  - **Resource-level** — the list, campaign, segment or template id already
 *    identifies its owning client, so no client id is passed.
 *
 * **A credential carries that scope too.** Campaign Monitor issues API keys at
 * both levels — an account key from Account settings, and a per-client key that
 * is a field of the client-details response — and the `/transactional`
 * endpoints branch on which you hold: an account key or OAuth *must* pass an
 * explicit `clientID`, a client key must not. Nothing in a stored credential
 * reveals which kind it is, so those actions expose `clientId` as an optional
 * param with the rule stated at the field rather than guessing.
 *
 * ## The four findings that shaped this app
 *
 *  1. **An ordinary read returns a live credential** (`actions/client-get.ts`,
 *     `lib/client.ts#stripSecrets`). `GET /clients/{clientid}.json` is documented
 *     as returning "the complete details for a client **including their API
 *     key**", and its example response opens with `"ApiKey": "639d8cc…"`. That
 *     is a working client-scoped key. It is deleted before the action returns,
 *     and that endpoint is therefore not — and can never be — the health probe.
 *     The probe is `GET /systemdate.json`, whose entire response is one date
 *     string.
 *  2. **401 means five different things, and one of them is not an auth
 *     failure** (`lib/client.ts#CODE_MEANINGS`). Classify from the body's
 *     `Code`, never the status: `100` invalid/absent API key (the same body for
 *     both, measured), `120`/`121`/`122` invalid/expired/revoked OAuth token,
 *     and `102` **Invalid ClientID** — a perfectly good credential with a wrong
 *     resource id. `403` likewise splits: `Code 403` is "Not allowed for a
 *     Non-agency Customer", i.e. the credential is live and the *endpoint* is
 *     out of reach.
 *  3. **Neither the API nor the docs site 404s for things that do not exist.**
 *     `api.createsend.com` checks authentication *before* routing, so
 *     `/api/v3.3/definitely-not-real-zzz.json` answers the same
 *     `401 {"Code":100}` as a real endpoint — an unauthenticated probe proves
 *     reachability and nothing else. And the documentation site serves **HTTP
 *     200** with ~139 KB of plausible reference prose for `/api/v3-4/`,
 *     `/api/v3-5/` and `/api/v4/`; the only marker of a stale version is a
 *     banner absent from the v3-3 page. Every endpoint here was therefore taken
 *     from the reference, and v3.3 was confirmed current by that banner's
 *     absence rather than by a status code.
 *  4. **`/transactional` is a different API sharing the hostname**
 *     (`lib/client.ts#transactional`). No `.json` extension (adding one 404s),
 *     camelCase segments, JSON-only, `clientID` with a capital D, and the only
 *     endpoints in the product that are rate limited or carry `X-RateLimit-*`
 *     headers.
 *
 * ## Retries
 *
 * Campaign Monitor accepts **no idempotency key on any endpoint**, so
 * `ctx.invocation.invocationId` has nowhere to go. Idempotency is therefore a
 * property of each endpoint's own semantics and is declared honestly per action:
 * the four sends (`campaign-send`, `campaign-send-preview`, `smart-email-send`,
 * `classic-email-send`) and the two creates that reject duplicate names
 * (`list-create`, `campaign-create`) are `false`; the upserts and deletes are
 * `true`.
 *
 * ## Health
 *
 * Campaign Monitor's status page is real, machine-readable and unreachable to a
 * server-side client — a WAF answers `403 Invalid request blocked (v1)` to every
 * request without a full desktop-browser User-Agent. That is declared as an
 * absence with the evidence (`health/service.ts`), and the reachability question
 * is answered instead by `health/api.ts`, which probes `api.createsend.com`
 * unsigned and treats a schema-correct `401 {"Code":100}` as a pass.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";
import oauth2 from "./auth/oauth2.ts";

// Account-level
import clientList from "./actions/client-list.ts";
import billingDetailsGet from "./actions/billing-details-get.ts";
import systemDateGet from "./actions/system-date-get.ts";

// Client-level
import clientGet from "./actions/client-get.ts";
import clientListsGet from "./actions/client-lists-get.ts";
import clientListsForEmailGet from "./actions/client-lists-for-email-get.ts";
import clientSegmentsGet from "./actions/client-segments-get.ts";
import clientTemplatesGet from "./actions/client-templates-get.ts";
import clientTagsGet from "./actions/client-tags-get.ts";
import clientSuppressionListGet from "./actions/client-suppression-list-get.ts";
import clientSuppress from "./actions/client-suppress.ts";
import clientUnsuppress from "./actions/client-unsuppress.ts";
import clientCampaignsGet from "./actions/client-campaigns-get.ts";
import clientDraftsGet from "./actions/client-drafts-get.ts";

// Lists
import listCreate from "./actions/list-create.ts";
import listGet from "./actions/list-get.ts";
import listStatsGet from "./actions/list-stats-get.ts";
import listCustomFieldsGet from "./actions/list-custom-fields-get.ts";
import listSegmentsGet from "./actions/list-segments-get.ts";
import listSubscribersGet from "./actions/list-subscribers-get.ts";

// Subscribers
import subscriberAdd from "./actions/subscriber-add.ts";
import subscriberUpdate from "./actions/subscriber-update.ts";
import subscriberGet from "./actions/subscriber-get.ts";
import subscriberHistoryGet from "./actions/subscriber-history-get.ts";
import subscriberUnsubscribe from "./actions/subscriber-unsubscribe.ts";
import subscriberDelete from "./actions/subscriber-delete.ts";
import subscriberImport from "./actions/subscriber-import.ts";

// Campaigns
import campaignCreate from "./actions/campaign-create.ts";
import campaignSend from "./actions/campaign-send.ts";
import campaignSendPreview from "./actions/campaign-send-preview.ts";
import campaignUnschedule from "./actions/campaign-unschedule.ts";
import campaignSummaryGet from "./actions/campaign-summary-get.ts";
import campaignRecipientsGet from "./actions/campaign-recipients-get.ts";
import campaignInteractionsGet from "./actions/campaign-interactions-get.ts";
import campaignListsAndSegmentsGet from "./actions/campaign-lists-and-segments-get.ts";

// Templates
import templateGet from "./actions/template-get.ts";

// Transactional
import smartEmailList from "./actions/smart-email-list.ts";
import smartEmailGet from "./actions/smart-email-get.ts";
import smartEmailSend from "./actions/smart-email-send.ts";
import classicEmailSend from "./actions/classic-email-send.ts";
import transactionalStatisticsGet from "./actions/transactional-statistics-get.ts";
import transactionalMessagesGet from "./actions/transactional-messages-get.ts";

import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Account-level — no id in the path
    clientList,
    billingDetailsGet,
    systemDateGet,
    // Client-level — {clientid} in the path
    clientGet,
    clientListsGet,
    clientListsForEmailGet,
    clientSegmentsGet,
    clientTemplatesGet,
    clientTagsGet,
    clientSuppressionListGet,
    clientSuppress,
    clientUnsuppress,
    clientCampaignsGet,
    clientDraftsGet,
    // Lists
    listCreate,
    listGet,
    listStatsGet,
    listCustomFieldsGet,
    listSegmentsGet,
    listSubscribersGet,
    // Subscribers
    subscriberAdd,
    subscriberUpdate,
    subscriberGet,
    subscriberHistoryGet,
    subscriberUnsubscribe,
    subscriberDelete,
    subscriberImport,
    // Campaigns
    campaignCreate,
    campaignSend,
    campaignSendPreview,
    campaignUnschedule,
    campaignSummaryGet,
    campaignRecipientsGet,
    campaignInteractionsGet,
    campaignListsAndSegmentsGet,
    // Templates
    templateGet,
    // Transactional
    smartEmailList,
    smartEmailGet,
    smartEmailSend,
    classicEmailSend,
    transactionalStatisticsGet,
    transactionalMessagesGet,
  ],
  // Both methods Campaign Monitor documents. OAuth is the vendor's own
  // preference and the only one that can request narrowed permissions; the API
  // key needs no app registration. A Connection picks one.
  auth: [apiKey, oauth2],
  healthChecks: [api, service, quota],
} satisfies AppDefinition;
