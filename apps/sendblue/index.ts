/**
 * Sendblue — iMessage/SMS/RCS business messaging, over the Sendblue REST API
 * (`api.sendblue.co`).
 *
 * Every path, header, request/response field, and enum in this app was
 * verified on 2026-08-25 against Sendblue's own documentation portal
 * (`docs.sendblue.com`): the hand-authored `api-v2/*` guide pages under
 * Messages, Media, Reactions, Carousel, Read Receipts, Typing Indicators,
 * RCS, Contact Sharing, Line Provisioning, Subaccounts, TOTP, Location
 * Sharing, Verify, Contacts, and Seats — plus the parallel SDK-generated
 * `api/resources/*` reference (Stainless, built from Sendblue's own OpenAPI
 * document) — cross-checked against live probes of `api.sendblue.co`.
 * Nothing here came from a third-party integration directory.
 *
 * The findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **The two doc trees disagree on the API host.** Every SDK-generated
 *     example calls `https://api.sendblue.co`; every hand-authored guide page
 *     calls `https://api.sendblue.com`. Both answer identically live, but DNS
 *     shows `.co` as a direct CNAME to the production ALB and `.com` as a
 *     Cloudflare-fronted alias of the same backend. `.co` is used throughout
 *     this app. See `lib/client.ts`.
 *  2. **Four path vintages coexist on one host with no consistent rule**:
 *     bare `/api/send-message`, legacy singular `/api/message/:handle`
 *     (delete only), `/api/v2/...`, and bare `/v3/...` (verified contacts,
 *     temporary tokens) — sometimes on the SAME resource area. See
 *     `lib/client.ts` and the per-action comments.
 *  3. **Sendblue Verify is an INVERTED OTP**, not Twilio-style: the recipient
 *     texts a code back to a Sendblue number, and there is no "submit the
 *     code" endpoint at all — a caller building a code-input form has nowhere
 *     to POST it. See `actions/verify-verification-create.ts`.
 *  4. **Two ordinary reads return live credentials.** `POST
 *     /accounts/lines/request-child-account` (subaccounts) hands back a new
 *     child account's `api_key`/`api_secret` in plaintext — legitimately, since
 *     provisioning IS the point of that call, which is exactly why it and the
 *     rest of the agency-only subaccount/line-provisioning surface are
 *     deliberately NOT implemented here; see the app README for the full list
 *     of what was left out and why.
 *
 * Two auth-adjacent surfaces exist that this app deliberately does not wire
 * into its own `sign` hook: `POST /v3/auth/tokens` mints a short-lived,
 * optionally line-scoped BEARER token from the account's key pair (a second,
 * narrower credential a caller can hand to a less-trusted process), and the
 * TOTP endpoints store/read a caller-managed 2FA secret. Both are exposed as
 * ordinary actions, not as alternate Auth methods, because this app's own
 * Connection always uses the primary key pair.
 */
import type { AppDefinition } from "@w6w/types";
import apiKeys from "./auth/api-keys.ts";

import messageSend from "./actions/message-send.ts";
import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";
import messageStatusGet from "./actions/message-status-get.ts";
import messageDelete from "./actions/message-delete.ts";
import messageAppCardUpdate from "./actions/message-app-card-update.ts";

import groupSendMessage from "./actions/group-send-message.ts";
import groupModify from "./actions/group-modify.ts";

import mediaUploadFromUrl from "./actions/media-upload-from-url.ts";
import reactionSend from "./actions/reaction-send.ts";
import readReceiptSend from "./actions/read-receipt-send.ts";
import typingIndicatorSend from "./actions/typing-indicator-send.ts";
import lookupNumber from "./actions/lookup-number.ts";
import carouselSend from "./actions/carousel-send.ts";

import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactCount from "./actions/contact-count.ts";
import contactVerify from "./actions/contact-verify.ts";
import contactOptOut from "./actions/contact-opt-out.ts";
import contactBulkCreate from "./actions/contact-bulk-create.ts";
import contactBulkDelete from "./actions/contact-bulk-delete.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import totpGetCode from "./actions/totp-get-code.ts";
import totpSecretCreate from "./actions/totp-secret-create.ts";
import totpSecretList from "./actions/totp-secret-list.ts";
import totpSecretDelete from "./actions/totp-secret-delete.ts";

import seatList from "./actions/seat-list.ts";
import seatCount from "./actions/seat-count.ts";
import seatGet from "./actions/seat-get.ts";

import lineStateGet from "./actions/line-state-get.ts";

import locationRequestCreate from "./actions/location-request-create.ts";
import locationList from "./actions/location-list.ts";
import locationGet from "./actions/location-get.ts";

import verifiedContactCreate from "./actions/verified-contact-create.ts";
import verifiedContactList from "./actions/verified-contact-list.ts";
import verifiedContactGet from "./actions/verified-contact-get.ts";

import verifyServiceCreate from "./actions/verify-service-create.ts";
import verifyServiceList from "./actions/verify-service-list.ts";
import verifyVerificationCreate from "./actions/verify-verification-create.ts";
import verifyVerificationGet from "./actions/verify-verification-get.ts";
import verifyVerificationList from "./actions/verify-verification-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import lines from "./health/lines.ts";

export default {
  actions: [
    // Messages
    messageSend,
    messageList,
    messageGet,
    messageStatusGet,
    messageDelete,
    messageAppCardUpdate,
    // Groups
    groupSendMessage,
    groupModify,
    // Media, reactions, receipts, typing, lookup, carousel
    mediaUploadFromUrl,
    reactionSend,
    readReceiptSend,
    typingIndicatorSend,
    lookupNumber,
    carouselSend,
    // Contacts
    contactList,
    contactCreate,
    contactGet,
    contactUpdate,
    contactDelete,
    contactCount,
    contactVerify,
    contactOptOut,
    contactBulkCreate,
    contactBulkDelete,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    // TOTP
    totpGetCode,
    totpSecretCreate,
    totpSecretList,
    totpSecretDelete,
    // Seats
    seatList,
    seatCount,
    seatGet,
    // Lines
    lineStateGet,
    // Location sharing
    locationRequestCreate,
    locationList,
    locationGet,
    // Verified contacts (recipient verification for free-plan lines)
    verifiedContactCreate,
    verifiedContactList,
    verifiedContactGet,
    // Verify (inverted-OTP phone verification)
    verifyServiceCreate,
    verifyServiceList,
    verifyVerificationCreate,
    verifyVerificationGet,
    verifyVerificationList,
  ],
  // API Key + Secret only. Sendblue publishes no OAuth surface for third-party
  // integrations — the two-header credential pair is the whole story.
  auth: [apiKeys],
  healthChecks: [service, quota, lines],
} satisfies AppDefinition;
