/**
 * Zoho Campaigns — email marketing, over the Zoho Campaigns REST API v1.1
 * (`https://campaigns.zoho.com/api/v1.1/...`, and its seven regional
 * siblings).
 *
 * Every path, verb, parameter and error shape in this app was verified on
 * 2026-09-05 against Zoho's own documentation
 * (`https://www.zoho.com/campaigns/help/developers/` and the ~25 per-resource
 * pages it links to — access-token, list-management and its linked pages,
 * campaign-management and its linked pages, error-codes) and live probes
 * against all eight regional API hosts and their accounts hosts. Nothing
 * here came from a third-party integration directory or from this pack's
 * other Zoho apps without independent re-verification against Zoho
 * Campaigns' own pages — its API surface, transport shape and even its
 * Canada quirk genuinely differ from all four (see below).
 *
 * Scoped to **Zoho Campaigns specifically** — this pack already ships `zoho`
 * (Zoho CRM), `zohobooks` (Zoho Books), `zohodesk` (Zoho Desk), `zohomail`
 * (Zoho Mail) and `zoho-invoice` (Zoho Invoice), separate products with
 * separate API surfaces; do not confuse them.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The API host is `campaigns.zoho.<tld>`, not the shared
 *     `www.zohoapis.<tld>` gateway every other Zoho app in this pack
 *     addresses** (`lib/regions.ts`, `lib/client.ts`). Zoho Campaigns is
 *     older than the unified `zohoapis` gateway and was never migrated onto
 *     it — its own docs only ever show `https://campaigns.zoho.com/api/v1.1/`.
 *  2. **Every parameter travels as a QUERY STRING value, even on a
 *     documented `POST`** (`lib/client.ts`) — not one of the vendor's own
 *     sample requests, across every endpoint checked, shows a request body,
 *     despite several pages' header block printing `Content-Type:
 *     application/x-www-form-urlencoded`. The opposite of `zoho-invoice`
 *     and `zohobooks`, which POST a JSON body.
 *  3. **Canada breaks the hostname pattern on BOTH the API host and the
 *     accounts host** (`lib/regions.ts`) — worse than every other Zoho app
 *     in this pack, where only the accounts host breaks pattern.
 *     `campaigns.zoho.ca` does not resolve at all (confirmed live); the real
 *     Campaigns API host for Canada is ALSO `campaigns.zohocloud.ca`.
 *  4. **No organization/account id anywhere** (`lib/client.ts`) — unlike
 *     Zoho Books/Invoice's per-call organization id, Zoho Campaigns' API
 *     acts on the one account the token authorizes, with nothing to
 *     discover or pass. There is no `organization-list`-equivalent action
 *     in this app for that reason.
 *  5. **The response envelope is inconsistent, not a uniform wrapper**
 *     (`lib/client.ts`) — most endpoints inline their payload at the top
 *     level alongside `{"status":"success","code":"0"}`, but three
 *     (`custom/add`, `contact/allfields`, and unexpectedly `sendcampaign`)
 *     nest it one level deeper under `"response"`. A failure's `Code`/`URI`
 *     are capitalized where a success's `code`/`uri` are not.
 *  6. **No way to tell "never configured" apart from "revoked/expired"**
 *     (`auth/oauth2.ts`) — unlike Zoho Invoice's two distinct codes (14 vs
 *     57), Zoho Campaigns answers the identical `401 {"Code":"1007"}` for a
 *     missing `Authorization` header and for a syntactically-plausible dead
 *     token, confirmed live against every regional host.
 *  7. **Two endpoints name the format parameter `type`, not `resfmt`**
 *     (`lib/client.ts`) — `contact/allfields` and `custom/add`.
 *  8. **No quota surface exists** (`health/quota.ts`) — real per-endpoint
 *     rate limits are documented (they vary PER ENDPOINT, not per account),
 *     but no `X-RateLimit-*` (or equivalent) response header is exposed to
 *     probe headroom ahead of the rejection.
 *
 * Deliberately absent: coupon management (Shopify-specific, jurisdiction/
 * platform-specific in ways this app does not attempt to model generically),
 * merge tags (the vendor's own doc page for it is internally inconsistent —
 * a parameter table that omits a parameter its own sample URL uses, and a
 * sample error code absent from the vendor's own error-codes page — so this
 * app does not implement it rather than guess at the real contract), and
 * topic management (its doc page is a bare three-row table naming three
 * method names with no parameter tables, sample requests or response shapes
 * to verify against).
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import listList from "./actions/list-list.ts";
import listCreate from "./actions/list-create.ts";
import listUpdate from "./actions/list-update.ts";
import listDelete from "./actions/list-delete.ts";
import listCount from "./actions/list-count.ts";
import listAdvancedDetails from "./actions/list-advanced-details.ts";

import contactAddBulk from "./actions/contact-add-bulk.ts";
import contactSubscribe from "./actions/contact-subscribe.ts";
import contactUnsubscribe from "./actions/contact-unsubscribe.ts";
import contactDoNotMail from "./actions/contact-do-not-mail.ts";
import contactList from "./actions/contact-list.ts";
import contactFieldsList from "./actions/contact-fields-list.ts";
import contactFieldCreate from "./actions/contact-field-create.ts";

import segmentGetDetails from "./actions/segment-get-details.ts";
import segmentGetContacts from "./actions/segment-get-contacts.ts";

import campaignCreate from "./actions/campaign-create.ts";
import campaignListRecent from "./actions/campaign-list-recent.ts";
import campaignListRecentlySent from "./actions/campaign-list-recently-sent.ts";
import campaignGetDetails from "./actions/campaign-get-details.ts";
import campaignGetReports from "./actions/campaign-get-reports.ts";
import campaignSend from "./actions/campaign-send.ts";
import campaignSchedule from "./actions/campaign-schedule.ts";
import campaignClone from "./actions/campaign-clone.ts";
import campaignDelete from "./actions/campaign-delete.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // lists
    listList,
    listCreate,
    listUpdate,
    listDelete,
    listCount,
    listAdvancedDetails,
    // contacts
    contactAddBulk,
    contactSubscribe,
    contactUnsubscribe,
    contactDoNotMail,
    contactList,
    contactFieldsList,
    contactFieldCreate,
    // segments
    segmentGetDetails,
    segmentGetContacts,
    // campaigns
    campaignCreate,
    campaignListRecent,
    campaignListRecentlySent,
    campaignGetDetails,
    campaignGetReports,
    campaignSend,
    campaignSchedule,
    campaignClone,
    campaignDelete,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
