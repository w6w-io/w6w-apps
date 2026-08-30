/**
 * WhatConverts — call, form, chat and transaction conversion tracking and attribution, over
 * the WhatConverts API v1 (`app.whatconverts.com/api/v1`).
 *
 * Every path, parameter and response field in this app was read directly off WhatConverts's
 * own published reference (`whatconverts.com/api/{overview,accounts,profiles,users,roles,
 * leads,recordings,tracking}/`) plus live probes against `app.whatconverts.com` and
 * `status.whatconverts.com`, both on 2026-08-29. WhatConverts publishes prose documentation
 * rather than an OpenAPI/Postman document — nothing here came from a third-party
 * integration directory.
 *
 * The findings that shaped this app, documented in full where they matter:
 *
 *  1. **Every conversion event is a "lead"** (`lib/lead-fields.ts`). A phone call, a web
 *     form submission, a chat, an email, a transaction, an appointment, a text message and
 *     a custom "event" all surface through one `leads` resource with a `lead_type`
 *     discriminator, rather than a resource per channel — the app follows the vendor's own
 *     shape instead of inventing a resource per lead type.
 *  2. **Basic auth over two credential kinds** (`auth/basic.ts`). Every request carries
 *     `Authorization: Basic base64(token:secret)`. A Profile Key reaches leads/recordings/
 *     tracking; a Master Account ("Agency") Key additionally reaches accounts, profiles,
 *     roles and users. Missing vs. wrong credentials share one HTTP status (401) but carry
 *     two distinct, stable `error_message` strings, so the health probe classifies on the
 *     message rather than the status code.
 *  3. **A wrong path 404s into the web app, not the API** (`lib/client.ts`). An undeclared
 *     `/api/v1/...` path answers the WhatConverts web app's own HTML "page couldn't be
 *     found" shell, confirmed live — this app treats a non-JSON error body as such rather
 *     than trying to parse it as `{"error_message": ...}`.
 *  4. **No rate-limit headers to read.** WhatConverts states its ceiling in prose (10,000
 *     requests/day per key; 1 request/ms, 20 concurrent) but a live probe confirmed neither
 *     a success nor a 401 carries any `X-RateLimit-*`/`Retry-After` header — so this app
 *     declares no `quota` health check.
 *  5. **The status page names an `API` component directly** (`health/service.ts`) —
 *     confirmed as WhatConverts's own, genuine Statuspage instance, distinct from its
 *     `Dashboard` (web app) and `Website` (marketing site) components.
 *
 * Agency-only resources (Accounts, Profiles, Roles, Users) are included because WhatConverts
 * documents them as a first-class part of this same API, gated by credential kind rather
 * than by a different host or auth scheme — the vendor's own "Agency Key is required to
 * access this resource" notice on each page is surfaced in that action's description
 * instead of this app trying to detect the credential kind in advance.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import leadsList from "./actions/leads-list.ts";
import leadGet from "./actions/lead-get.ts";
import leadCreate from "./actions/lead-create.ts";
import leadUpdate from "./actions/lead-update.ts";

import recordingGet from "./actions/recording-get.ts";

import accountsList from "./actions/accounts-list.ts";
import accountGet from "./actions/account-get.ts";
import accountCreate from "./actions/account-create.ts";
import accountUpdate from "./actions/account-update.ts";
import accountDelete from "./actions/account-delete.ts";

import profilesList from "./actions/profiles-list.ts";
import profileGet from "./actions/profile-get.ts";
import profileCreate from "./actions/profile-create.ts";
import profileUpdate from "./actions/profile-update.ts";
import profileDelete from "./actions/profile-delete.ts";

import rolesList from "./actions/roles-list.ts";
import roleGet from "./actions/role-get.ts";

import trackingNumbersList from "./actions/tracking-numbers-list.ts";
import trackingNumberDelete from "./actions/tracking-number-delete.ts";
import trackingFormsList from "./actions/tracking-forms-list.ts";
import trackingFormDelete from "./actions/tracking-form-delete.ts";

import usersList from "./actions/users-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Leads
    leadsList,
    leadGet,
    leadCreate,
    leadUpdate,
    // Recordings
    recordingGet,
    // Accounts (Master Account Key)
    accountsList,
    accountGet,
    accountCreate,
    accountUpdate,
    accountDelete,
    // Profiles (Master Account Key)
    profilesList,
    profileGet,
    profileCreate,
    profileUpdate,
    profileDelete,
    // Roles (Master Account Key)
    rolesList,
    roleGet,
    // Tracking
    trackingNumbersList,
    trackingNumberDelete,
    trackingFormsList,
    trackingFormDelete,
    // Users (Master Account Key)
    usersList,
    userGet,
    userCreate,
    userUpdate,
  ],
  // Basic auth (token + secret) is WhatConverts's entire authentication story — no OAuth
  // surface is published for third-party apps.
  auth: [basic],
  healthChecks: [service],
} satisfies AppDefinition;
