/**
 * JustCall — the cloud phone system and SMS/calling platform: read and update
 * calls, send and read texts, manage contacts (including DND/DNM/blacklist
 * status), read phone numbers, look up and update user availability, and
 * manage webhook subscriptions, over JustCall's REST API v2.1.
 *
 * Every path, verb, parameter and response schema in this app was verified on
 * 2026-09-05 against the per-endpoint OpenAPI 3.0 fragment embedded in each
 * `developer.justcall.io/reference/*` page this app covers, plus live probes
 * against `api.justcall.io` and `status.justcall.io`. JustCall publishes no
 * single combined OpenAPI document — each reference page ships its own
 * `paths` + `components.schemas` block, so every endpoint below was read from
 * its own page rather than inferred from a sibling.
 *
 * The three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The credential is a raw `key:secret` pair, not Basic auth**
 *     (`auth/api-key.ts`). `Authorization: api_key:api_secret`, unencoded — the
 *     vendor's own `-u "api_key:api_secret"` curl example is what makes this
 *     look like HTTP Basic auth, but Basic Base64-encodes that pair and this
 *     API does not.
 *  2. **The response envelope is not one shape** (`lib/client.ts`). Most list
 *     endpoints answer `{status, data: [...], count, next_page_link, ...}`;
 *     `GET /contacts/{id}` answers `{status, data: {...}}`; `POST`/`PUT
 *     /contacts` answer `{status, data: [{...}]}` — an **array of one** even
 *     though exactly one contact is created or updated; and several
 *     endpoints' own documented schema (calls, texts, users) shows no
 *     envelope at all. The client unwraps defensively rather than assuming a
 *     single shape holds everywhere.
 *  3. **JustCall does not distinguish "no credential" from "wrong credential"**
 *     (`auth/api-key.ts`). An unauthenticated request and one signed with a
 *     fabricated key/secret pair both answer identically:
 *     `401 {"status":"failed","message":"Unauthorized"}` — measured live,
 *     2026-09-05.
 *
 * Rate limiting is real and plan-dependent (`docs/rate-limits.md`), read from
 * genuine `X-Rate-Limit-*` response headers — see `health/quota.ts` for what
 * could and could not be confirmed live without a test account.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callUpdate from "./actions/call-update.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactUpdateStatus from "./actions/contact-update-status.ts";
import contactDelete from "./actions/contact-delete.ts";

import phoneNumberList from "./actions/phone-number-list.ts";
import phoneNumberGet from "./actions/phone-number-get.ts";

import textList from "./actions/text-list.ts";
import textGet from "./actions/text-get.ts";
import textSend from "./actions/text-send.ts";
import textCheckReply from "./actions/text-check-reply.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userUpdateAvailability from "./actions/user-update-availability.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookDeleteUrl from "./actions/webhook-delete-url.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Calls
    callList,
    callGet,
    callUpdate,
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactUpdateStatus,
    contactDelete,
    // Phone numbers
    phoneNumberList,
    phoneNumberGet,
    // Texts
    textList,
    textGet,
    textSend,
    textCheckReply,
    // Users
    userList,
    userGet,
    userUpdateAvailability,
    // Webhooks
    webhookList,
    webhookCreate,
    webhookDeleteUrl,
  ],
  // API Key + Secret only. JustCall publishes no OAuth surface for
  // third-party apps.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
