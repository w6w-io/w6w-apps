/**
 * Omnisend — email/SMS marketing automation for ecommerce: manage contacts,
 * tag them individually or in bulk by ID/email/phone/segment, and send the
 * customer events (recommended or custom) that trigger Omnisend's own
 * automations, segments, and reporting.
 *
 * Every path, header, and response field here was verified on 2026-09-05
 * against Omnisend's own machine-readable OpenAPI 3.0 reference (published at
 * `api-docs.omnisend.com`, `2026-03-15` API version) plus live probes against
 * `api.omnisend.com` and `status.omnisend.com`. Nothing here came from a
 * third-party integration directory.
 *
 * Three findings that shaped the design:
 *
 *  1. **The auth scheme is not Bearer.** Every request signs with
 *     `Authorization: Omnisend-API-Key <key>` (`auth/api-key.ts`) — a
 *     vendor-defined `apiKey` scheme, not OAuth's Bearer, even though OAuth
 *     2.0 (client-credentials, real `Bearer`) is separately supported and
 *     documented for the same endpoints.
 *  2. **Every request needs a second, fixed header.** `Omnisend-Version:
 *     2026-03-15` is required on every call (`lib/client.ts`) — this whole
 *     app is pinned to that version deliberately, so a future Omnisend
 *     release cannot silently change the response shape underneath it.
 *  3. **Batch tagging is asynchronous and rate-limited far tighter than
 *     everything else.** `POST`/`DELETE /contacts/tags` return `202 Accepted`
 *     with no body (the tags may not be visible immediately) and are capped
 *     at 60 requests/minute — a sixth of the 400/minute default that covers
 *     every other endpoint here.
 *
 * Errors are RFC 9457 Problem Details (`{type, title, status, detail}`) on
 * every failure. Omnisend publishes no rate-limit response header of any
 * kind — measured live against `/brands/current`, both unauthenticated and
 * with a fake key: no `X-RateLimit-*`-shaped header on either response.
 * `health/quota.ts` declares that absence rather than guessing at it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listContacts from "./actions/list-contacts.ts";
import getContact from "./actions/get-contact.ts";
import createOrUpdateContact from "./actions/create-or-update-contact.ts";
import updateContactByEmail from "./actions/update-contact-by-email.ts";
import addContactTags from "./actions/add-contact-tags.ts";
import removeContactTags from "./actions/remove-contact-tags.ts";

import sendEvent from "./actions/send-event.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    listContacts,
    getContact,
    createOrUpdateContact,
    updateContactByEmail,
    addContactTags,
    removeContactTags,
    // Events
    sendEvent,
  ],
  // API key only. OAuth 2.0 is documented for the same endpoints, but the API
  // key path needs no redirect flow and covers every action here.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
