/**
 * Cursor — the AI code editor's **Admin/Teams API**: team member management,
 * usage and spend reporting, per-user spend limits, repo context blocklists,
 * Enterprise billing groups, and model-access policy.
 *
 * This app deliberately does NOT cover Cursor the IDE (no public API), nor
 * the separate Analytics API, AI Code Tracking API, Cloud Agents API, or
 * Organization API (`docs/api` lists all five as siblings of the Admin API;
 * this app is the Admin API only, per its own manifest scope).
 *
 * Every path, verb, request/response field and error shape here was read
 * live on 2026-09-05 from `cursor.com/docs/account/teams/admin-api` (the
 * Admin API reference itself) and `cursor.com/docs/api` (auth, rate limits,
 * shared error taxonomy) — not inferred from another AI-vendor's admin
 * surface. The four findings that shaped the design:
 *
 *  1. **Basic auth, key as the username, empty password**
 *     (`auth/basic.ts`) — `-u YOUR_API_KEY:`, not a bearer token. Every
 *     documented example uses it; a Bearer scheme exists but is scoped to
 *     the separate Cloud Agents API.
 *  2. **Scoped keys, and this app needs the broad one.** Keys carry scopes
 *     (`admin:*`, `models:read`, `models:*`, generic `read:*`). The doc
 *     names `admin:*` as the required scope for the Admin API in its own
 *     key-setup walkthrough, and the model-access sub-routes separately spell
 *     out that `read:*` keys are refused. A `models:*`-only key will
 *     authenticate but be refused (403) on every action outside model
 *     access.
 *  3. **Three different error-body shapes in the SAME API**
 *     (`lib/client.ts`): the general taxonomy is `{"error", "message"}`, but
 *     `remove-member` puts the whole message inside `error` with no separate
 *     `message`, and the model-access routes (plus the 429 response) answer
 *     `{"code": "error", "message"}` instead. Getting this wrong means a
 *     perfectly good 400 response reads back as `undefined: undefined`.
 *  4. **`daily-usage-get` changes response SHAPE, not just content, based on
 *     which params are set** (`actions/daily-usage-get.ts`): omit
 *     `page`/`pageSize` and you get only active users with no pagination
 *     envelope; set both and you get every team member (including inactive
 *     ones) with an `isActive` field and a `pagination` object.
 *
 * The Admin/Teams API surface is genuinely small — a team-management
 * surface, not a general product API — so this app is small on purpose: it
 * covers exactly what the reference documents, nothing padded in. The
 * `model-access` and `user-spend-limits-bulk-set` routes are themselves
 * marked **preview** by the vendor; they are implemented (they are fully
 * documented, with worked examples) but flagged as such in their own
 * descriptions.
 */
import type { AppDefinition } from "@w6w/types";
import basicAuth from "./auth/basic.ts";

import membersList from "./actions/members-list.ts";
import memberRemove from "./actions/member-remove.ts";
import auditLogsList from "./actions/audit-logs-list.ts";

import dailyUsageGet from "./actions/daily-usage-get.ts";
import spendGet from "./actions/spend-get.ts";
import usageEventsList from "./actions/usage-events-list.ts";
import userSpendLimitSet from "./actions/user-spend-limit-set.ts";
import userSpendLimitsBulkSet from "./actions/user-spend-limits-bulk-set.ts";

import repoBlocklistList from "./actions/repo-blocklist-list.ts";
import repoBlocklistUpsert from "./actions/repo-blocklist-upsert.ts";
import repoBlocklistDelete from "./actions/repo-blocklist-delete.ts";

import groupList from "./actions/group-list.ts";
import groupGet from "./actions/group-get.ts";
import groupCreate from "./actions/group-create.ts";
import groupUpdate from "./actions/group-update.ts";
import groupDelete from "./actions/group-delete.ts";
import groupMembersAdd from "./actions/group-members-add.ts";
import groupMembersRemove from "./actions/group-members-remove.ts";

import modelAccessConfigurationGet from "./actions/model-access-configuration-get.ts";
import modelAccessConfigurationUpdate from "./actions/model-access-configuration-update.ts";
import modelAccessProvidersList from "./actions/model-access-providers-list.ts";
import modelAccessProviderUpdate from "./actions/model-access-provider-update.ts";
import modelAccessProviderModelsList from "./actions/model-access-provider-models-list.ts";
import modelAccessModelUpdate from "./actions/model-access-model-update.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // Members
    membersList,
    memberRemove,
    auditLogsList,
    // Usage & spend
    dailyUsageGet,
    spendGet,
    usageEventsList,
    userSpendLimitSet,
    userSpendLimitsBulkSet,
    // Repo context blocklists
    repoBlocklistList,
    repoBlocklistUpsert,
    repoBlocklistDelete,
    // Billing groups (Enterprise)
    groupList,
    groupGet,
    groupCreate,
    groupUpdate,
    groupDelete,
    groupMembersAdd,
    groupMembersRemove,
    // Model access (preview)
    modelAccessConfigurationGet,
    modelAccessConfigurationUpdate,
    modelAccessProvidersList,
    modelAccessProviderUpdate,
    modelAccessProviderModelsList,
    modelAccessModelUpdate,
  ],
  // Basic auth only. Cursor publishes no OAuth flow for the Admin API; the
  // key IS the whole authentication story.
  auth: [basicAuth],
  healthChecks: [service],
} satisfies AppDefinition;
