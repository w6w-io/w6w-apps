/**
 * Clio — legal practice management (matters, contacts, tasks, calendar,
 * time/expense entries, documents), on the **Clio Manage API v4**.
 *
 * Every path, verb, parameter and required field in this app was verified
 * on 2026-08-24 against Clio's own OpenAPI 3.1 document
 * (`docs.developers.clio.com/openapi.json`, 3,217,360 bytes, `info.title`
 * "Clio API Documentation", `info.version` `v4`), the Docusaurus reference
 * pages it links to, and live probes against all four regional API hosts
 * plus `status.clio.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Three findings that would each cost someone real debugging time — full
 * detail in `README.md` and each finding's own source file:
 *
 *  1. **Two, textually incompatible shapes of `401`** (`lib/client.ts`). No
 *     `Authorization` header (or a malformed one) gets the OpenAPI-documented
 *     `{"error": {"type", "message"}}` object; a well-formed but
 *     invalid/expired bearer token gets an RFC 6750 challenge instead, whose
 *     body's `error` field is a bare STRING. Code that assumes the first
 *     shape throws on the far more common second case (an expired 30-day
 *     access token).
 *  2. **`quantity` on a TimeEntry means HOURS on old API versions and
 *     SECONDS on the current one** (`actions/activity-create.ts`), per the
 *     field's own OpenAPI description — a 3,600x error hiding in a field
 *     whose name never changed.
 *  3. **A create schema's own top-level `required` array contradicts its
 *     field-level descriptions** (`actions/note-create.ts`): `Note` create
 *     lists `contact` AND `matter` as both required, while each field's own
 *     text says it is required only when `type` selects it.
 *
 * Two structural decisions worth knowing before extending this app:
 *
 *  - **Four regions, four Auth methods, not a region field** (`auth/`,
 *    `lib/client.ts`). Clio runs entirely separate US/EU/CA/AU deployments,
 *    each with its OWN `/oauth/authorize` host — which has to be decided
 *    BEFORE the browser redirect, so it cannot be a connect-time form field.
 *    Every Action is region-agnostic; it reads the region `afterConnect`
 *    recorded on the Connection via `apiBase(ctx)`.
 *  - **Fields default to almost nothing.** Per Clio's own guide, omitting
 *    `fields` returns only `id`/`etag` on most endpoints. Every list/get
 *    Action here prefills a sensible field list rather than the vendor's own
 *    near-empty default.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import oauth2Au from "./auth/oauth2-au.ts";
import oauth2Ca from "./auth/oauth2-ca.ts";
import oauth2Eu from "./auth/oauth2-eu.ts";

import matterList from "./actions/matter-list.ts";
import matterGet from "./actions/matter-get.ts";
import matterCreate from "./actions/matter-create.ts";
import matterUpdate from "./actions/matter-update.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";
import taskUpdate from "./actions/task-update.ts";

import calendarEntryList from "./actions/calendar-entry-list.ts";
import calendarEntryGet from "./actions/calendar-entry-get.ts";
import calendarEntryCreate from "./actions/calendar-entry-create.ts";

import activityList from "./actions/activity-list.ts";
import activityGet from "./actions/activity-get.ts";
import activityCreate from "./actions/activity-create.ts";
import activityUpdate from "./actions/activity-update.ts";

import documentList from "./actions/document-list.ts";
import documentGet from "./actions/document-get.ts";
import documentDownloadGet from "./actions/document-download-get.ts";

import noteList from "./actions/note-list.ts";
import noteCreate from "./actions/note-create.ts";

import userWhoAmI from "./actions/user-who-am-i.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Matters
    matterList,
    matterGet,
    matterCreate,
    matterUpdate,
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    // Tasks
    taskList,
    taskGet,
    taskCreate,
    taskUpdate,
    // Calendar
    calendarEntryList,
    calendarEntryGet,
    calendarEntryCreate,
    // Activities (time/expense/cost entries)
    activityList,
    activityGet,
    activityCreate,
    activityUpdate,
    // Documents
    documentList,
    documentGet,
    documentDownloadGet,
    // Notes
    noteList,
    noteCreate,
    // Users
    userWhoAmI,
  ],
  // One per Clio region — see this file's own doc comment and `auth/oauth2.ts`.
  auth: [oauth2, oauth2Eu, oauth2Ca, oauth2Au],
  healthChecks: [service, quota],
} satisfies AppDefinition;
