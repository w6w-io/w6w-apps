/**
 * Dialpad — the cloud business phone / calling platform (`dialpad.com`), over
 * the Admin API v2 (`dialpad.com/api/v2`).
 *
 * Every path, verb, parameter and response field in this app was verified on
 * 2026-08-29 against Dialpad's own OpenAPI 3.1 document — fetched live from
 * `dash.readme.com/api/v1/api-registry/cwu1asmtbsrjuf`, the registry id
 * `developers.dialpad.com/reference` itself resolves in its server-rendered
 * page props (`oasPublicUrl: "@dialpad/v1.0#cwu1asmtbsrjuf"`) — plus live
 * probes against `dialpad.com`, `sandbox.dialpad.com` and
 * `status.dialpad.com`. Nothing here came from a third-party integration
 * directory.
 *
 * The three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **Two live signing secrets hide in ordinary reads** (`lib/client.ts`,
 *     every webhook and call-router action). `GET`/`POST`/`PATCH` on a webhook
 *     or an API call router all echo `signature.secret` — the literal string
 *     Dialpad signs outbound payloads with. Confirmed in the vendor's own
 *     OpenAPI example for `POST /api/v2/webhooks`:
 *     `"signature": {"algo": "HS256", "secret": "test_secret", "type": "jwt"}`.
 *     Stripped before any Action returns one of these entities, or a call
 *     event subscription that embeds one.
 *  2. **A 401 does not distinguish "no key" from "wrong key"** (`auth/api-key.ts`,
 *     `lib/client.ts`). Measured live: an absent `Authorization` header and a
 *     syntactically-plausible-but-wrong bearer token answer the byte-identical
 *     `{"error": {"code": 401, "message": "A valid API key must be
 *     provided.", ...}}`.
 *  3. **Some actions need a company-admin key, and the credential probe must
 *     not be one of them** (`auth/api-key.ts`, `actions/company-get.ts`). The
 *     spec tags several endpoints `x-access: admin` — `GET /api/v2/company`
 *     among them — so this app's Auth `test` hook probes
 *     `GET /api/v2/offices` instead, which the spec tags `x-access: user` and
 *     both key types can reach.
 *
 * There is no SMS list/history endpoint in this API — see
 * `actions/sms-send.ts` for what "list" actually maps to here (bulk and
 * scheduled sends, not per-message history) and the README's "Deliberately
 * not covered" section for the rest of the ~200 documented operations this
 * app does not implement.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callInitiate from "./actions/call-initiate.ts";
import callHangup from "./actions/call-hangup.ts";
import callTransfer from "./actions/call-transfer.ts";

import usersList from "./actions/users-list.ts";
import usersGet from "./actions/users-get.ts";
import usersCreate from "./actions/users-create.ts";
import usersUpdate from "./actions/users-update.ts";
import usersDelete from "./actions/users-delete.ts";

import smsSend from "./actions/sms-send.ts";

import contactsList from "./actions/contacts-list.ts";
import contactsGet from "./actions/contacts-get.ts";
import contactsCreate from "./actions/contacts-create.ts";
import contactsUpdate from "./actions/contacts-update.ts";
import contactsDelete from "./actions/contacts-delete.ts";

import callroutersList from "./actions/callrouters-list.ts";
import callroutersGet from "./actions/callrouters-get.ts";
import callroutersCreate from "./actions/callrouters-create.ts";
import callroutersUpdate from "./actions/callrouters-update.ts";
import callroutersDelete from "./actions/callrouters-delete.ts";

import roomsList from "./actions/rooms-list.ts";
import roomsGet from "./actions/rooms-get.ts";
import roomsCreate from "./actions/rooms-create.ts";
import roomsUpdate from "./actions/rooms-update.ts";
import roomsDelete from "./actions/rooms-delete.ts";

import webhooksList from "./actions/webhooks-list.ts";
import webhooksCreate from "./actions/webhooks-create.ts";
import webhooksGet from "./actions/webhooks-get.ts";
import webhooksUpdate from "./actions/webhooks-update.ts";
import webhooksDelete from "./actions/webhooks-delete.ts";

import callEventSubscriptionList from "./actions/call-event-subscription-list.ts";
import callEventSubscriptionCreate from "./actions/call-event-subscription-create.ts";

import companyGet from "./actions/company-get.ts";
import officesList from "./actions/offices-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Calls
    callList,
    callGet,
    callInitiate,
    callHangup,
    callTransfer,
    // Users
    usersList,
    usersGet,
    usersCreate,
    usersUpdate,
    usersDelete,
    // SMS
    smsSend,
    // Contacts
    contactsList,
    contactsGet,
    contactsCreate,
    contactsUpdate,
    contactsDelete,
    // Call routers
    callroutersList,
    callroutersGet,
    callroutersCreate,
    callroutersUpdate,
    callroutersDelete,
    // Rooms
    roomsList,
    roomsGet,
    roomsCreate,
    roomsUpdate,
    roomsDelete,
    // Webhooks
    webhooksList,
    webhooksCreate,
    webhooksGet,
    webhooksUpdate,
    webhooksDelete,
    // Call event subscriptions
    callEventSubscriptionList,
    callEventSubscriptionCreate,
    // Company / offices
    companyGet,
    officesList,
  ],
  // API key only. Dialpad's own "Authentication" section names a bearer API
  // key as the whole story for this REST surface; OAuth2 exists for
  // registering a multi-company Marketplace app, a different use case — see
  // auth/api-key.ts.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
