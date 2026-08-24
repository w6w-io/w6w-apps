/**
 * systeme.io — the all-in-one marketing platform: funnels, email campaigns
 * and newsletters, contacts and tags, courses and enrollments, communities and
 * memberships, and outbound webhooks, over the Public API v1
 * (`api.systeme.io`).
 *
 * Every path, verb, parameter, body field and enum in this app was verified on
 * 2026-08-24 against systeme.io's own OpenAPI 3.1 document. The rendered
 * reference page (`developer.systeme.io/reference/api`) is a Readme.io site
 * with no visible "download spec" link, but Readme.io embeds the full spec as
 * JSON inside the page's server-rendered `<script id="ssr-props">` payload
 * (`document.api.schema`) — that is the source read here, not the rendered
 * HTML, and it is a genuine machine-readable OpenAPI document (45 paths, 82
 * operations), not a marketing page. Nothing here came from a third-party
 * integration directory.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Auth is `X-API-Key`, not a bearer token** (`auth/api-key.ts`). The
 *     vendor's own words: "your only option right now is to attach your API
 *     key to the `X-API-Key` header of each request" — no `Bearer ` prefix,
 *     no OAuth2 surface.
 *  2. **`PATCH` uses `application/merge-patch+json`, not `application/json`**
 *     (`lib/client.ts`). Confirmed from the OpenAPI document's own
 *     `requestBody.content` key on every PATCH operation; sending plain JSON
 *     is undocumented behaviour.
 *  3. **Two different 401 bodies for two different problems** (`auth/api-key.ts`,
 *     confirmed live 2026-08-24): a missing key answers `{"detail":"Full
 *     authentication is required to access this resource."}`; a wrong key
 *     answers `{"detail":"Invalid API Key."}` plus a `WWW-Authenticate: API
 *     Key` header the first case never carries. Both are genuine
 *     `application/problem+json` bodies.
 *  4. **No status page exists** (`health/service.ts`). The Statuspage and
 *     Instatus subdomain guesses both resolve to the known unclaimed-subdomain
 *     signatures, not a quiet page — confirmed by content length and redirect
 *     target, not assumed from a 404 alone.
 *
 * ## Scope: 9 of systeme.io's 12 resource groups, deliberately
 *
 * This app covers Contacts, Tags, ContactFields, Funnels, mailing Campaigns,
 * Newsletters, Webhooks, School (courses/enrollments) and Community
 * (communities/memberships) — the resources the vendor itself describes
 * ("manage contacts, tags, and a variety of other operations") plus the ones a
 * workflow host needs to address them (contact fields, webhooks).
 *
 * Deliberately **not** implemented, and why (see also README.md):
 *
 *  - **Funnel steps and campaign steps** (`/api/funnels/{id}/steps`,
 *    `/api/mailing/campaigns/{id}/steps`, `/api/funnel-steps/{id}`,
 *    `/api/mailing/campaign-steps/{id}`) — these address individual page/email
 *    steps inside a funnel or campaign, which are authored in systeme.io's own
 *    visual editor. A funnel or campaign can be created and addressed by this
 *    app; its internal steps cannot.
 *  - **Newsletter tag targeting** (`/api/mailing/newsletters/{id}/excluded-tags`,
 *    `/included-tags`) — audience-targeting detail on top of a newsletter this
 *    app can already create.
 *  - **Payment** (coupons, price plans, digital products, subscriptions) and
 *    **SMS templates** and **booking calendar** — real, documented, verified
 *    endpoints, out of scope for this build pass because they sit closer to
 *    commerce/billing than to the marketing-automation surface this app
 *    targets.
 *  - **Page editor** (`/api/page-editor/*`) — internal page-builder wire
 *    format (raw page-schema JSON), not a workflow-shaped operation.
 *
 * None of this is "couldn't confirm" — every one of these paths is fully
 * documented in the same OpenAPI schema everything else here was verified
 * against. It is a scope decision for this build pass, stated so it reads as
 * one.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactTagAdd from "./actions/contact-tag-add.ts";
import contactTagRemove from "./actions/contact-tag-remove.ts";

import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import tagGet from "./actions/tag-get.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";

import contactFieldList from "./actions/contact-field-list.ts";
import contactFieldCreate from "./actions/contact-field-create.ts";
import contactFieldUpdate from "./actions/contact-field-update.ts";
import contactFieldDelete from "./actions/contact-field-delete.ts";

import funnelList from "./actions/funnel-list.ts";
import funnelGet from "./actions/funnel-get.ts";
import funnelCreate from "./actions/funnel-create.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignUpdate from "./actions/campaign-update.ts";
import campaignDelete from "./actions/campaign-delete.ts";

import newsletterList from "./actions/newsletter-list.ts";
import newsletterGet from "./actions/newsletter-get.ts";
import newsletterCreate from "./actions/newsletter-create.ts";
import newsletterUpdate from "./actions/newsletter-update.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import courseList from "./actions/course-list.ts";
import enrollmentCreate from "./actions/enrollment-create.ts";
import enrollmentList from "./actions/enrollment-list.ts";
import enrollmentDelete from "./actions/enrollment-delete.ts";

import communityList from "./actions/community-list.ts";
import membershipCreate from "./actions/membership-create.ts";
import membershipList from "./actions/membership-list.ts";
import membershipDelete from "./actions/membership-delete.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Contacts
    contactList,
    contactCreate,
    contactGet,
    contactUpdate,
    contactDelete,
    contactTagAdd,
    contactTagRemove,
    // Tags
    tagList,
    tagCreate,
    tagGet,
    tagUpdate,
    tagDelete,
    // Contact fields
    contactFieldList,
    contactFieldCreate,
    contactFieldUpdate,
    contactFieldDelete,
    // Funnels
    funnelList,
    funnelGet,
    funnelCreate,
    // Email campaigns
    campaignList,
    campaignGet,
    campaignCreate,
    campaignUpdate,
    campaignDelete,
    // Newsletters
    newsletterList,
    newsletterGet,
    newsletterCreate,
    newsletterUpdate,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    // School
    courseList,
    enrollmentCreate,
    enrollmentList,
    enrollmentDelete,
    // Community
    communityList,
    membershipCreate,
    membershipList,
    membershipDelete,
  ],
  // API key only. systeme.io publishes no OAuth2 surface for third-party apps.
  auth: [apiKey],
  healthChecks: [service],
} satisfies AppDefinition;
