/**
 * Wati — a WhatsApp Team Inbox and Business API platform: a shared inbox for human agents plus a
 * REST API for sending template and session messages, managing contacts, and reading conversation
 * history. This app covers Wati's recommended API V3 surface (`/api/ext/v3/...`).
 *
 * Every path, verb and field here was verified 2026-09-05 against the OpenAPI 3.0.4 document
 * embedded per-endpoint in Wati's own ReadMe-hosted API reference (`docs.wati.io`, project id
 * `5fd7b2fd549312005640ac11`, `info.title: "WhatsApp chat API"`, `info.version: "v3"`) — not a
 * third-party integration directory or the legacy V1/V2 docs.
 *
 * The findings that shaped the design, each documented in full where it matters:
 *
 *  1. **There is no shared API host.** Every Wati customer's endpoint is its own shard + tenant
 *     id (`https://live-mt-server.wati.io/<tenantId>`, or `live-mt-server-XXXXX.wati.io` for
 *     some accounts) copied from the customer's own account — like `kintone`/`mautic`/`tableau`
 *     in this pack, it is a connection field, not a fixed host (`lib/client.ts`,
 *     `auth/api-token.ts`).
 *  2. **The auth scheme is typed `apiKey`, but the wire format is a hand-typed `Bearer` header.**
 *     Wati's own OpenAPI security scheme is `type: "apiKey"` with a description telling the
 *     caller to type the literal string `Bearer <token>` — not `type: "http", scheme: "bearer"`
 *     as the OpenAPI spec would normally model it (`lib/client.ts`, `auth/api-token.ts`).
 *  3. **A 401 is documented in prose only, and is often bodyless.** Every OTHER 4xx/5xx across
 *     the whole V3 document shares one `{code, message, timestamp}` shape, but no path declares
 *     response content for 401 — `formatWatiError` degrades to raw text/status rather than
 *     assuming every failure is JSON (`lib/client.ts`).
 *  4. **The same "custom params" concept is spelled two different ways in the same API
 *     version.** `POST /contacts` takes `custom_params`; `PUT /contacts` takes `customParams` on
 *     each item. Neither `contact-create.ts` nor `contacts-update.ts` normalises this away —
 *     each sends the literal key its own operation documents (`lib/client.ts`).
 *  5. **The vendor's own status-page RSS feed reuses one `<guid>` across unrelated
 *     components**, which would silently break this platform's generic feed-backed health-check
 *     support (`latestPerId` folds by id) — `health/service.ts` fetches and groups by title
 *     instead, and documents exactly why the declarative `feed:` field was not used.
 *  6. **The rate limit is prose-only, and per-plan.** `errors` states fixed ceilings
 *     (`10/10sec`, `30–100/10sec` depending on plan/endpoint) with no response header or
 *     counter endpoint — `health/quota.ts` reads the one thing that IS a real, checkable
 *     balance instead: the tenant's own credit/free-conversation account.
 *
 * Not covered: interactive (buttons/list/product) messages, broadcasts management, calls,
 * WhatsApp groups, chatbots, sales analytics, segments, and posts/comments (Instagram/Messenger
 * inbox features) — see README for the full list and why each was left out.
 */
import type { AppDefinition } from "@w6w/types";
import apiToken from "./auth/api-token.ts";

import accountCreditsGet from "./actions/account-credits-get.ts";
import contactsCountGet from "./actions/contacts-count-get.ts";
import contactsList from "./actions/contacts-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactsUpdate from "./actions/contacts-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import conversationMessagesGet from "./actions/conversation-messages-get.ts";
import messageTextSend from "./actions/message-text-send.ts";
import messageFileSend from "./actions/message-file-send.ts";
import templatesList from "./actions/templates-list.ts";
import templateMessagesSend from "./actions/template-messages-send.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import tenant from "./health/tenant.ts";

export default {
  actions: [
    // Account
    accountCreditsGet,
    // Contacts
    contactsCountGet,
    contactsList,
    contactGet,
    contactCreate,
    contactsUpdate,
    contactDelete,
    // Conversations
    conversationMessagesGet,
    messageTextSend,
    messageFileSend,
    // Templates
    templatesList,
    templateMessagesSend,
  ],
  auth: [apiToken],
  healthChecks: [service, quota, tenant],
} satisfies AppDefinition;
