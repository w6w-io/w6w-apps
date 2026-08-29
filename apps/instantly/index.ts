/**
 * Instantly — cold-email outreach and campaign platform, over API v2
 * (`api.instantly.ai/api/v2`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-29 against Instantly's own machine-readable OpenAPI 3.0
 * document (`api.instantly.ai/openapi/api_v2.json`, 4,221,761 bytes,
 * `info.version` `2.0.0`, 184 paths), the prose pages linked from
 * `developer.instantly.ai/llms.txt`, and live probes against
 * `api.instantly.ai`, `status.instantly.ai` and the `*.statuspage.io`
 * subdomains a status page would live at. Nothing here came from a
 * third-party integration directory.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Every route is scope-gated, and there is no unscoped key**
 *     (`auth/api-key.ts`). Instantly's key-creation screen makes the caller
 *     tick individual per-resource scopes; there is no "give me everything"
 *     default. The health probe was chosen with that in mind, and picks the
 *     resource this app's own action surface centres on rather than a
 *     scope-free "whoami" — because Instantly publishes no such thing, not
 *     even `GET /workspaces/current`.
 *  2. **Connecting a sending account means handing Instantly that mailbox's
 *     own IMAP/SMTP password as a request field** (`actions/account-create.ts`).
 *     This is a deliberate, narrow exception to "credentials only in `sign`":
 *     that password belongs to the mailbox being provisioned, not to this
 *     app's own Connection, so it cannot be injected by `sign` — there is
 *     nothing for `sign` to inject it INTO. Both password fields are declared
 *     `type: "secret"`.
 *  3. **Three numeric status enums look alike and are not interchangeable**
 *     (`lib/params.ts`). Campaign status, Account status, and the `status`
 *     filter on `bulkDeleteLeads` all use small overlapping integer sets
 *     (`-3..4`-ish) with DIFFERENT meanings per resource — `2` is "Paused" on
 *     an Account, also "Paused" on a Campaign, but the lead-delete filter's
 *     `3` is "Completed" where an Account's `3` is "Temporarily paused for
 *     maintenance". Each is kept as its own named option list rather than one
 *     shared enum.
 *
 * Cursor pagination throughout: every list endpoint pages with `limit` (max
 * 100) and an opaque `starting_after`/`next_starting_after` cursor pair —
 * there is no offset and no total count. Errors are uniformly
 * `{statusCode, error, message}` — see `lib/client.ts` for how `message`
 * is preserved rather than collapsed to a bare status code.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignCreate from "./actions/campaign-create.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignPatch from "./actions/campaign-patch.ts";
import campaignDelete from "./actions/campaign-delete.ts";
import campaignActivate from "./actions/campaign-activate.ts";
import campaignPause from "./actions/campaign-pause.ts";
import campaignDuplicate from "./actions/campaign-duplicate.ts";
import campaignAnalyticsGet from "./actions/campaign-analytics-get.ts";
import campaignAnalyticsOverviewGet from "./actions/campaign-analytics-overview-get.ts";
import campaignSendingStatusGet from "./actions/campaign-sending-status-get.ts";

import leadCreate from "./actions/lead-create.ts";
import leadGet from "./actions/lead-get.ts";
import leadPatch from "./actions/lead-patch.ts";
import leadDelete from "./actions/lead-delete.ts";
import leadList from "./actions/lead-list.ts";
import leadBulkAdd from "./actions/lead-bulk-add.ts";
import leadBulkDelete from "./actions/lead-bulk-delete.ts";
import leadMove from "./actions/lead-move.ts";
import leadUpdateInterestStatus from "./actions/lead-update-interest-status.ts";

import accountList from "./actions/account-list.ts";
import accountCreate from "./actions/account-create.ts";
import accountGet from "./actions/account-get.ts";
import accountPatch from "./actions/account-patch.ts";
import accountDelete from "./actions/account-delete.ts";
import accountPause from "./actions/account-pause.ts";
import accountResume from "./actions/account-resume.ts";
import accountPauseBulk from "./actions/account-pause-bulk.ts";
import accountMarkFixed from "./actions/account-mark-fixed.ts";
import accountWarmupAnalyticsGet from "./actions/account-warmup-analytics-get.ts";
import accountDailyAnalyticsGet from "./actions/account-daily-analytics-get.ts";

import emailList from "./actions/email-list.ts";
import emailGet from "./actions/email-get.ts";
import emailReply from "./actions/email-reply.ts";
import emailForward from "./actions/email-forward.ts";
import emailUnreadCountGet from "./actions/email-unread-count-get.ts";
import emailThreadMarkRead from "./actions/email-thread-mark-read.ts";

import workspaceGet from "./actions/workspace-get.ts";

import service from "./health/service.ts";
import rateLimit from "./health/rate-limit.ts";

export default {
  actions: [
    // Campaigns
    campaignList,
    campaignCreate,
    campaignGet,
    campaignPatch,
    campaignDelete,
    campaignActivate,
    campaignPause,
    campaignDuplicate,
    campaignAnalyticsGet,
    campaignAnalyticsOverviewGet,
    campaignSendingStatusGet,
    // Leads
    leadCreate,
    leadGet,
    leadPatch,
    leadDelete,
    leadList,
    leadBulkAdd,
    leadBulkDelete,
    leadMove,
    leadUpdateInterestStatus,
    // Sending accounts
    accountList,
    accountCreate,
    accountGet,
    accountPatch,
    accountDelete,
    accountPause,
    accountResume,
    accountPauseBulk,
    accountMarkFixed,
    accountWarmupAnalyticsGet,
    accountDailyAnalyticsGet,
    // Unibox
    emailList,
    emailGet,
    emailReply,
    emailForward,
    emailUnreadCountGet,
    emailThreadMarkRead,
    // Workspace
    workspaceGet,
  ],
  // API key only. Instantly publishes no OAuth surface for third-party apps;
  // the key is the whole authentication story.
  auth: [apiKey],
  healthChecks: [service, rateLimit],
} satisfies AppDefinition;
