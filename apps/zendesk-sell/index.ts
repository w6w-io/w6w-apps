/**
 * Zendesk Sell (formerly Base CRM / getbase.com) — contacts, leads, deals,
 * notes and tasks, over the Sell API v2 at `api.getbase.com`.
 *
 * **This is a different product from the pack's `apps/zendesk/` app.** That
 * app is Zendesk Support (ticketing) — a different host, a different auth
 * story, a different data model. Sell shares only a parent company with it;
 * `w6w.displayName: "Zendesk Sell"` exists specifically so the two are never
 * confused in a listing.
 *
 * Every path, verb, field and enum in this app was verified on 2026-09-01
 * against the vendor's own reference at
 * `developer.zendesk.com/api-reference/sales-crm/` (Introduction, Requests,
 * Responses, Errors, Rate Limits, Authentication/*, Resources/*) plus live
 * probes against `api.getbase.com` and `status.zendesk.com`. Nothing here came
 * from a third-party integration directory.
 *
 * The three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **The API host never moved to a `zendesk.com` domain** (`lib/client.ts`).
 *     The vendor's old `developers.getbase.com` reference now 301-redirects
 *     into Zendesk's unified developer docs, and it is tempting to assume the
 *     wire endpoint moved with it. It did not: every OAuth and resource
 *     example in the current reference — hosted at `developer.zendesk.com` —
 *     still targets `https://api.getbase.com`.
 *  2. **List and single-resource responses use different envelopes**
 *     (`lib/client.ts`). A single resource is `{"data": {...}}`; a collection
 *     is `{"items": [{"data": {...}, "meta": {...}}, ...]}` — each item
 *     double-wrapped, not a bare array of records.
 *  3. **`status.zendesk.com` genuinely has a dedicated Sell component**
 *     (service id 63, slug `"sell"`) but exposes it only through an
 *     undocumented internal API, not a public Statuspage-style endpoint or
 *     feed (`health/service.ts`).
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactUpsert from "./actions/contact-upsert.ts";

import leadList from "./actions/lead-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";
import leadDelete from "./actions/lead-delete.ts";
import leadUpsert from "./actions/lead-upsert.ts";
import leadConvert from "./actions/lead-convert.ts";

import dealList from "./actions/deal-list.ts";
import dealGet from "./actions/deal-get.ts";
import dealCreate from "./actions/deal-create.ts";
import dealUpdate from "./actions/deal-update.ts";
import dealDelete from "./actions/deal-delete.ts";
import dealUpsert from "./actions/deal-upsert.ts";

import noteList from "./actions/note-list.ts";
import noteGet from "./actions/note-get.ts";
import noteCreate from "./actions/note-create.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";
import taskDelete from "./actions/task-delete.ts";

import userList from "./actions/user-list.ts";
import accountGet from "./actions/account-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactUpsert,
    // Leads
    leadList,
    leadGet,
    leadCreate,
    leadUpdate,
    leadDelete,
    leadUpsert,
    leadConvert,
    // Deals
    dealList,
    dealGet,
    dealCreate,
    dealUpdate,
    dealDelete,
    dealUpsert,
    // Notes
    noteList,
    noteGet,
    noteCreate,
    noteUpdate,
    noteDelete,
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    taskDelete,
    // Account & Users
    userList,
    accountGet,
  ],
  // OAuth 2.0 only — Sell publishes no other authentication method for
  // third-party apps.
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
