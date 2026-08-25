/**
 * SignNow — e-signature via the REST API
 * (`https://api.signnow.com` or `https://api-eval.signnow.com`).
 *
 * Covers the agreement lifecycle a workflow actually drives against a
 * document that already exists in the account: send it for signature, watch
 * and manage invites, download the signed PDF, move/delete it, work from
 * templates, and subscribe a webhook to its events — plus the folder and
 * account reads that feed those steps.
 *
 * **Documents are not created here.** SignNow's `POST /document` only accepts
 * a real multipart file upload (no `file_url` alternative, unlike some
 * peers). This pack's Actions run in a sandbox whose `ctx.fetch` stringifies
 * every request body on its way to the network, so arbitrary binary content
 * (a PDF, DOCX, …) cannot survive the trip intact — there is no faithful way
 * to originate a new document upload from inside an Action here. Documents
 * are expected to already exist in the account (created via SignNow's UI, an
 * upload elsewhere, or copied from a template — `document-create-from-template`
 * *is* implemented, since it is a server-side copy with no upload involved).
 * See `README.md`.
 *
 * Deliberately absent:
 *
 *   - **`document-upload` / `document/fieldextract`.** See above.
 *   - **The authorization_code OAuth grant.** SignNow's machine-readable
 *     contract documents only `POST /oauth2/token`, not a separate
 *     `/oauth2/authorize` endpoint — without a verified authorization URL
 *     this app cannot mint a safe browser redirect. See `auth/oauth2-password.ts`.
 *   - **`event-subscription-list` / `event-subscription-delete`.** SignNow
 *     documents these as **Basic**-only (the API application's own
 *     `client_id:client_secret`), while this app's `sign` hook only ever
 *     stamps the per-user Bearer token — and an Action cannot touch the raw
 *     credential to switch schemes. See `lib/client.ts`.
 *   - **Document field/tab placement (`PUT /document/{id}` "Edit document").**
 *     Positions fillable fields by page coordinates — SignNow's own editor and
 *     template designer are for that, the same reasoning this pack's
 *     `docusign` app applies to envelope tabs.
 *   - **Document groups, bulk invites, notary, payments, branding, teams and
 *     admin.** Each is a separate feature surface with its own configuration,
 *     not a workflow step.
 */
import type { AppDefinition } from "@w6w/types";

import oauth2Password from "./auth/oauth2-password.ts";

import documentGet from "./actions/document-get.ts";
import documentDownload from "./actions/document-download.ts";
import documentDelete from "./actions/document-delete.ts";
import documentMove from "./actions/document-move.ts";
import documentHistoryGet from "./actions/document-history-get.ts";
import documentInviteCreate from "./actions/document-invite-create.ts";
import documentInviteCancel from "./actions/document-invite-cancel.ts";
import documentDownloadLinkCreate from "./actions/document-download-link-create.ts";
import templateCreate from "./actions/template-create.ts";
import documentCreateFromTemplate from "./actions/document-create-from-template.ts";
import folderList from "./actions/folder-list.ts";
import folderCreate from "./actions/folder-create.ts";
import signingLinkCreate from "./actions/signing-link-create.ts";
import eventSubscriptionCreate from "./actions/event-subscription-create.ts";
import eventSubscriptionUpdate from "./actions/event-subscription-update.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // document
    documentGet,
    documentDownload,
    documentDelete,
    documentMove,
    documentHistoryGet,
    documentInviteCreate,
    documentInviteCancel,
    documentDownloadLinkCreate,
    // template
    templateCreate,
    documentCreateFromTemplate,
    // folder
    folderList,
    folderCreate,
    // signing link
    signingLinkCreate,
    // webhooks
    eventSubscriptionCreate,
    eventSubscriptionUpdate,
    // user
    userGet,
  ],
  auth: [oauth2Password],
  healthChecks: [service, quota],
} satisfies AppDefinition;
