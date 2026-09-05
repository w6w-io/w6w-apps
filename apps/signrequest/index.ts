/**
 * SignRequest — e-signature via the REST API (`https://signrequest.com/api/v1/`).
 *
 * Covers the document + SignRequest lifecycle: create a document (from a template, a public URL,
 * or inline base64 content), send it for signature, track/cancel/forward/resend the request,
 * download the signed result via the document's own `pdf` field, attach supporting files, and
 * subscribe webhooks to document/signer events — plus the template, team, member, event and
 * audit-event reads that feed those steps.
 *
 * **No standalone document-upload endpoint exists, and none is needed.** Unlike some peers in this
 * pack, SignRequest's `POST /documents/` itself accepts `file_from_url` (a publicly reachable URL
 * it downloads) and `file_from_content` (base64-encoded content) directly — no real multipart file
 * upload is required, so `document-create` covers the full range SignRequest's own API offers,
 * with nothing left out for a sandbox-transport reason.
 *
 * Deliberately absent:
 *
 *   - **`POST /api-tokens/` (mint a new API token).** Requires the account's own `email`+`password`
 *     — a second, different credential shape this app never collects, since an Action cannot be
 *     handed the raw credential to make that call. See `auth/api-key.ts`.
 *   - **`GET /api-tokens/` (list tokens).** The `AuthToken` schema carries a `key` field, so a list
 *     of existing tokens can echo token VALUES back in the response body — the same
 *     credential-echo shape this pack refuses for a health/auth probe, and not worth exposing as a
 *     plain action either. See `lib/client.ts`.
 *   - **Team creation, settings updates, deletion, and member invitation
 *     (`POST`/`PATCH`/`DELETE /teams/…`, `POST /teams/{subdomain}/invite_member/`).** Account
 *     administration, not a workflow step — SignRequest's own UI is for that.
 *   - **The Frontend "prefill" API and the SignRequest-js client.** Both are for a vendor's own
 *     hosted signup page / embedded widget, not a server-side workflow action.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import documentCreate from "./actions/document-create.ts";
import documentGet from "./actions/document-get.ts";
import documentList from "./actions/document-list.ts";
import documentDelete from "./actions/document-delete.ts";
import documentSearch from "./actions/document-search.ts";
import documentAttachmentCreate from "./actions/document-attachment-create.ts";
import documentAttachmentList from "./actions/document-attachment-list.ts";
import signrequestCreate from "./actions/signrequest-create.ts";
import signrequestQuickCreate from "./actions/signrequest-quick-create.ts";
import signrequestGet from "./actions/signrequest-get.ts";
import signrequestList from "./actions/signrequest-list.ts";
import signrequestCancel from "./actions/signrequest-cancel.ts";
import signrequestForwardSigner from "./actions/signrequest-forward-signer.ts";
import signrequestResendEmail from "./actions/signrequest-resend-email.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";
import teamList from "./actions/team-list.ts";
import teamMemberList from "./actions/team-member-list.ts";
import eventList from "./actions/event-list.ts";
import eventGet from "./actions/event-get.ts";
import auditEventList from "./actions/audit-event-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // document
    documentCreate,
    documentGet,
    documentList,
    documentDelete,
    documentSearch,
    documentAttachmentCreate,
    documentAttachmentList,
    // signrequest
    signrequestCreate,
    signrequestQuickCreate,
    signrequestGet,
    signrequestList,
    signrequestCancel,
    signrequestForwardSigner,
    signrequestResendEmail,
    // template
    templateList,
    templateGet,
    // webhook
    webhookCreate,
    webhookList,
    webhookGet,
    webhookUpdate,
    webhookDelete,
    // team
    teamList,
    teamMemberList,
    // events
    eventList,
    eventGet,
    auditEventList,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
