/**
 * JobNimbus — the field-service CRM built for roofing and other exterior/
 * home-services contractors. Contacts and Jobs move through
 * customer-configured workflows (Lead, Inspection, Approved, ...), with
 * Tasks and Activities (notes) hung off either one, over JobNimbus's own
 * "Open API" (`app.jobnimbus.com/api1`).
 *
 * Every path, verb, query parameter and body field in this app was verified
 * on 2026-09-01 against JobNimbus's own Postman collection ("JobNimbus
 * Public API"), reachable only via
 * https://documenter.getpostman.com/view/3919598/S11PpG4x — linked from
 * JobNimbus's own support article "How Do I Use JobNimbus' Open API?"
 * (support.jobnimbus.com/how-do-i-create-an-integration-using-jobnimbuss-open-api)
 * — plus live probes against `app.jobnimbus.com` and `status.jobnimbus.com`.
 * Nothing here came from a third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **There is no `developers.jobnimbus.com`.** That hostname does not
 *     resolve; the only path to the real docs is the support-article link
 *     above (`lib/client.ts`).
 *  2. **"Delete" is a soft-delete PUT.** JobNimbus's API has no DELETE verb;
 *     what the vendor's own docs call deleting a contact/job is
 *     `PUT .../<jnid> {"is_active": false}` (`lib/client.ts`,
 *     `actions/contact-delete.ts`, `actions/job-delete.ts`).
 *  3. **No rate-limit signal exists anywhere** — not on the wire, not in the
 *     docs — so quota headroom is a declared absence, not a guess
 *     (`health/quota.ts`).
 *
 * This app covers Contacts, Jobs, Tasks and Activities — the core CRM
 * surface. JobNimbus's collection also documents Files, Products,
 * MaterialOrders, WorkOrders, Estimates, Invoices, Payments and account-level
 * settings/workflow-configuration endpoints; those are left out rather than
 * guessed at, since several of them (Files, Payments) require multi-step
 * upload/presign flows or a distinct `/api2` host this app has not verified.
 */
import type { AppDefinition } from "@w6w/types";
import bearerToken from "./auth/bearer-token.ts";

import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import jobGet from "./actions/job-get.ts";
import jobList from "./actions/job-list.ts";
import jobCreate from "./actions/job-create.ts";
import jobUpdate from "./actions/job-update.ts";
import jobDelete from "./actions/job-delete.ts";

import taskList from "./actions/task-list.ts";
import taskCreate from "./actions/task-create.ts";

import activityList from "./actions/activity-list.ts";
import activityCreate from "./actions/activity-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactGet,
    contactList,
    contactCreate,
    contactUpdate,
    contactDelete,
    // Jobs
    jobGet,
    jobList,
    jobCreate,
    jobUpdate,
    jobDelete,
    // Tasks
    taskList,
    taskCreate,
    // Activities (notes)
    activityList,
    activityCreate,
  ],
  // A single static API Key is the whole authentication story — JobNimbus
  // publishes no OAuth surface for third-party apps.
  auth: [bearerToken],
  healthChecks: [service, quota],
} satisfies AppDefinition;
