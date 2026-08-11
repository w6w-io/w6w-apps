/**
 * Aircall — the cloud phone system: read and act on calls, resolve and maintain
 * contacts, drive click-to-call from an agent's Workspace, and manage the users,
 * teams, numbers, tags and webhooks behind them, over the Aircall Public API
 * (`api.aircall.io`).
 *
 * Every path, verb, query parameter, body field and enum in this app was
 * verified on 2026-08-11 against Aircall's own API reference
 * (`developer.aircall.io/api-references/`, which 301s to
 * `developers.aircall.io/api-references`, 875,367 bytes) plus live probes
 * against `api.aircall.io` and `status.aircall.com`. Nothing here came from a
 * third-party integration directory.
 *
 * The API is alive, with one narrow exception: grepping the whole reference for
 * `deprecat|sunset|will be removed|end of life` returns 49 hits, and every one
 * of them is about a *field* or a *single endpoint* — `Number.open`,
 * `Number.is_ivr`, `Call.cost`, the availability-status setting, call
 * archiving, and the `realtime_transcription` endpoint. There is no
 * platform-wide removal date and no v1 sunset. The one banner that does affect
 * this app is on the **User** endpoints, and is handled below.
 *
 * The five findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **403 means the credential is WRONG, not that it lacks permission**
 *     (`auth/basic.ts`, `lib/client.ts`). Measured: no credential →
 *     `401 {"message":"Unauthorized"}`; a bogus `api_id`/`api_token` pair →
 *     `403 {"message":"Forbidden"}`. Aircall's own per-endpoint tables agree —
 *     "403 — Forbidden. Invalid API key or Bearer access token" — and 401 never
 *     appears in the documented table at all. There is no scope system to be
 *     short of: OAuth has exactly one scope, `public_api`. Reading 403 the
 *     conventional way reports a dead credential as a healthy one.
 *  2. **Ordinary webhook reads return a live shared secret** (`lib/client.ts`,
 *     `actions/webhook-list.ts`, `actions/webhook-get.ts`). `GET /v1/webhooks`
 *     returns each webhook's `token` — the secret a receiver authenticates
 *     Aircall's deliveries with — for up to 100 webhooks at once. It is stripped
 *     on every read; `webhook-create`, which *issues* it, is the sole exception.
 *  3. **Users are v2, everything else is v1, and they interleave**
 *     (`lib/client.ts`). Every User V1 page carries "User V1 API will be
 *     deprecated soon. Please migrate to User V2 API", but the v2 User surface
 *     is strictly smaller: no availability endpoints, no click-to-call, no
 *     click-to-dial, and no `numbers` array on the object. So user *reads* go to
 *     v2 and the three capabilities v2 never got stay on v1.
 *  4. **The status page answers on a different host than the product**
 *     (`health/service.ts`). `status.aircall.io` **301s** to
 *     `status.aircall.com`, and a health check may only reach hosts it declares
 *     — the runtime does not follow a redirect out through the allowlist. This
 *     app declares and calls `status.aircall.com`, the host that answers
 *     directly, and confirms the page carries an `API & Webhooks` component so
 *     it is a statement about the surface this app calls.
 *  5. **The rate-limit headers may only exist once you are already limited**
 *     (`health/quota.ts`). The reference documents `X-AircallApi-Limit` /
 *     `-Remaining` / `-Reset` as available "when the rate limit has been
 *     reached", which is unresolvable from outside an authenticated session. The
 *     quota check reads them when present, says so plainly when not, and is
 *     `informational` so its steady-state `unknown` cannot pin the App's
 *     verdict.
 *
 * Two smaller shapes that bite: **Update Contact is a `POST`, not a `PUT`** (the
 * vendor flags this itself, and every other update here is a PUT), and
 * **`per_page` maxes out at 50** with a hard 10,000-item ceiling on paging
 * through Calls and Contacts.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import callList from "./actions/call-list.ts";
import callGet from "./actions/call-get.ts";
import callSearch from "./actions/call-search.ts";
import callTransfer from "./actions/call-transfer.ts";
import callComment from "./actions/call-comment.ts";
import callTag from "./actions/call-tag.ts";
import callRecordingPause from "./actions/call-recording-pause.ts";
import callRecordingResume from "./actions/call-recording-resume.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userNumberList from "./actions/user-number-list.ts";
import userAvailabilityList from "./actions/user-availability-list.ts";
import userAvailabilityGet from "./actions/user-availability-get.ts";
import userCallStart from "./actions/user-call-start.ts";
import userDial from "./actions/user-dial.ts";

import contactList from "./actions/contact-list.ts";
import contactSearch from "./actions/contact-search.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import teamList from "./actions/team-list.ts";
import teamGet from "./actions/team-get.ts";
import teamUserAdd from "./actions/team-user-add.ts";
import teamUserRemove from "./actions/team-user-remove.ts";

import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";

import numberList from "./actions/number-list.ts";
import numberGet from "./actions/number-get.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookGet from "./actions/webhook-get.ts";
import webhookCreate from "./actions/webhook-create.ts";
import webhookUpdate from "./actions/webhook-update.ts";
import webhookDelete from "./actions/webhook-delete.ts";

import companyGet from "./actions/company-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Calls
    callList,
    callGet,
    callSearch,
    callTransfer,
    callComment,
    callTag,
    callRecordingPause,
    callRecordingResume,
    // Users
    userList,
    userGet,
    userNumberList,
    userAvailabilityList,
    userAvailabilityGet,
    userCallStart,
    userDial,
    // Contacts
    contactList,
    contactSearch,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // Teams
    teamList,
    teamGet,
    teamUserAdd,
    teamUserRemove,
    // Tags
    tagList,
    tagGet,
    tagCreate,
    tagUpdate,
    tagDelete,
    // Numbers
    numberList,
    numberGet,
    // Webhooks
    webhookList,
    webhookGet,
    webhookCreate,
    webhookUpdate,
    webhookDelete,
    // Company
    companyGet,
  ],
  // API ID + API Token only. Aircall's other scheme, OAuth 2.0, is fully
  // documented but needs a `client_id`/`client_secret` Aircall issues by hand
  // after a partner application that requires a partner-hosted `install_uri` —
  // a hosting commitment, not a config value. Both schemes hit the same
  // endpoints, so adding it later grows this directory and touches nothing in
  // `actions/`. See `auth/basic.ts` and the README.
  auth: [basic],
  healthChecks: [service, quota],
} satisfies AppDefinition;
