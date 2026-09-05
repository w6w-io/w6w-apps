/**
 * Workable — jobs, candidates, pipeline stages, members and webhook
 * subscriptions, over the account's own SPI v3 API.
 *
 * Every path, verb, scope and response shape here was verified on 2026-09-05
 * against the `account-root.json` OpenAPI 3.1 document embedded in every page
 * of `workable.readme.io` (66 paths, `info.version` `3.16.2`), the "Getting
 * started", "Rate limiting" and "Webhook Subscriptions - Candidates &
 * Employees" prose guides on that same host, and live probes of
 * `*.workable.com` and `workable.statuspage.io`. Nothing here came from a
 * third-party integration directory.
 *
 * ## There is no vendor host
 *
 * Every Workable account gets its own subdomain
 * (`https://<subdomain>.workable.com/spi/v3/...`), confirmed by the OpenAPI
 * document's own `servers` entry and by every worked curl example in the
 * docs. So the subdomain is a Connection field, not a fixed hostname — the
 * posture this pack already uses for `zendesk` and `gorgias` — and
 * `w6w.network.allow` is the wildcard `*.workable.com`. See `lib/client.ts`
 * for the full reasoning, including why this rules out the usual
 * unauthenticated "is this tenant's subdomain reachable" check (Workable's
 * edge answers the identical 401 for a real subdomain and a made-up one —
 * `health/account.ts` probes SIGNED instead).
 *
 * ## Three things that go wrong quietly
 *
 *   - **Pagination is `paging.next` in the response BODY**, not a `Link`
 *     header the way Greenhouse or GitHub page. `lib/client.ts`'s `list()`
 *     returns that URL verbatim; every list action accepts it back as
 *     `pageUrl`.
 *   - **`GET /candidates` is account-wide**, despite its own OpenAPI summary
 *     literally saying "Returns a collection of the job's candidates" — the
 *     `shortcode` filter is optional, and omitting every filter returns every
 *     candidate in the account.
 *   - **Two of the vendor's own prose code samples give a stale, wrong URL
 *     shape** (`/accounts/{subdomain}/jobs/{shortcode}/candidates/{id}`,
 *     doubling the subdomain into the path) for `job-candidates-create` and
 *     `update-candidate` — this app follows the OpenAPI document's own
 *     `operationId` paths instead, which match every other reference page
 *     and the "Getting started" guide's own example.
 *
 * ## Auth
 *
 * A personal Access Token (Settings → Integrations → API), sent as
 * `Authorization: Bearer <token>`. There is no OAuth 2.0 flow for a general
 * integration; a separate "Partner Token" exists only for officially
 * approved partner integrations and is out of scope. See
 * `auth/access-token.ts`.
 *
 * ## Deliberately out of scope
 *
 * The HR/Employee endpoints (`/employees`, time off, time tracking,
 * performance review templates, onboarding), requisitions and offers, the
 * public unauthenticated `/api/accounts/:subdomain` job-board surface, and
 * the Job Board / Assessment / Video-Interview / Background-Check partner
 * integration surfaces — each is its own API area a recruiting-focused first
 * version does not touch. Receiving a webhook event (a Trigger) is also out
 * of scope for this version; `webhook-subscribe`/`webhook-unsubscribe`/
 * `webhook-subscription-list` manage the subscription only.
 */
import type { AppDefinition } from "@w6w/types";
import accessToken from "./auth/access-token.ts";

import jobList from "./actions/job-list.ts";
import jobGet from "./actions/job-get.ts";
import jobStageList from "./actions/job-stage-list.ts";
import candidateList from "./actions/candidate-list.ts";
import candidateGet from "./actions/candidate-get.ts";
import candidateCreate from "./actions/candidate-create.ts";
import candidateUpdate from "./actions/candidate-update.ts";
import candidateMove from "./actions/candidate-move.ts";
import candidateDisqualify from "./actions/candidate-disqualify.ts";
import candidateActivityList from "./actions/candidate-activity-list.ts";
import memberList from "./actions/member-list.ts";
import disqualificationReasonList from "./actions/disqualification-reason-list.ts";
import webhookSubscriptionList from "./actions/webhook-subscription-list.ts";
import webhookSubscribe from "./actions/webhook-subscribe.ts";
import webhookUnsubscribe from "./actions/webhook-unsubscribe.ts";

import account from "./health/account.ts";
import quota from "./health/quota.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // jobs
    jobList,
    jobGet,
    jobStageList,
    // candidates
    candidateList,
    candidateGet,
    candidateCreate,
    candidateUpdate,
    candidateMove,
    candidateDisqualify,
    candidateActivityList,
    // account
    memberList,
    disqualificationReasonList,
    // webhooks
    webhookSubscriptionList,
    webhookSubscribe,
    webhookUnsubscribe,
  ],
  auth: [accessToken],
  healthChecks: [account, quota, service],
} satisfies AppDefinition;
