/**
 * LearnWorlds — courses, users, enrollments, tags and payments for an online
 * school, on whichever domain that school runs.
 *
 * Every path, parameter and response shape here was cross-checked three ways:
 *
 *   1. The full v2 OpenAPI document for LearnWorlds' own Stoplight project
 *      (`learnworlds/api:main/2951998` — the same project id embedded in
 *      `www.learnworlds.dev`'s page source, so this is the live reference,
 *      not a lookalike), covering all 94 documented operations.
 *   2. A live, unsigned probe against a real production school
 *      (`academy.learnworlds.com`, 2026-09-05), which answered the exact
 *      documented error envelope for both `/admin/api/v2/courses` and
 *      `/admin/api/oauth2/access_token` — confirming the base path and the
 *      token endpoint are real, not aspirational documentation.
 *   3. LearnWorlds' own help center articles ("LearnWorlds API
 *      documentation", "How to Request your API Keys and Access Tokens"),
 *      which confirm v1 is retired, credentials are per-school, and API
 *      access is plan-gated (Learning Center / High Volume & Corporate only).
 *
 * ## There is no vendor host
 *
 * LearnWorlds is multi-tenant SaaS, but every school is served from its own
 * subdomain (`yourschool.learnworlds.com`) or a fully custom domain — not a
 * shared `api.learnworlds.com` gateway. Requesting that literal host 302s to
 * a "this school was deleted" page, because it was itself once a real school
 * subdomain used in LearnWorlds' own docs examples, not a placeholder. So the
 * base URL is a connection field and the egress allowlist is `["*"]`, the
 * posture this pack already uses for `mautic`, `gitea` and `bubble`.
 *
 * ## Two headers, every request — one of them not `Authorization`
 *
 * Every call, including the token exchange itself, must carry both
 * `Authorization: Bearer {token}` and `Lw-Client: {client_id}`. Miss the
 * second one and you get a schema-correct 400 ("Missing client_id or client
 * cannot be found"), not a 401 — see `auth/client-credentials.ts` for the
 * live-verified proof and why both headers are set in `sign`, never in an
 * Action.
 *
 * ## Legacy → current mapping (read before extending this app)
 *
 * LearnWorlds' 2025 platform update kept the v2 API surface unchanged but
 * remapped several legacy (v3) concepts underneath it: bundles and
 * subscriptions now enroll into "Learning Programs", and `original_price` /
 * `discount_price` / `final_price` on a course carry redefined meanings. The
 * endpoints and field names below are the ones the spec documents as stable
 * through that migration; anything the spec calls out as remapped is passed
 * through as-is rather than re-modeled, so a workflow reads the same field
 * names the vendor's own current docs describe.
 *
 * ## No rate-limit headroom to read
 *
 * Unlike most apps in this pack with a `quota` check, LearnWorlds documents a
 * fixed prose limit (30 requests/10s) and a `429` error shape, but no
 * response header or endpoint exposing remaining headroom — see
 * `health/quota.ts`.
 *
 * Deliberately out of scope for this first pass: courses/bundles/subscription
 * plans creation beyond the single `courses-list`/`course-get` reads,
 * promotions/coupons, affiliates, certificates, community spaces/posts, user
 * groups/roles, seats, and webhooks. Each is its own surface in the spec; this
 * app covers the daily loop of managing users, enrollments, tags, course
 * catalog reads and payment history a workflow touches most.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import coursesList from "./actions/courses-list.ts";
import courseGet from "./actions/course-get.ts";
import courseContentsGet from "./actions/course-contents-get.ts";
import usersList from "./actions/users-list.ts";
import userGet from "./actions/user-get.ts";
import userCreate from "./actions/user-create.ts";
import userUpdate from "./actions/user-update.ts";
import userEnrollmentsList from "./actions/user-enrollments-list.ts";
import userEnroll from "./actions/user-enroll.ts";
import userUnenroll from "./actions/user-unenroll.ts";
import userTagsUpdate from "./actions/user-tags-update.ts";
import paymentsList from "./actions/payments-list.ts";

import service from "./health/service.ts";
import school from "./health/school.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // courses
    coursesList,
    courseGet,
    courseContentsGet,
    // users
    usersList,
    userGet,
    userCreate,
    userUpdate,
    userTagsUpdate,
    // enrollments
    userEnrollmentsList,
    userEnroll,
    userUnenroll,
    // payments
    paymentsList,
  ],
  auth: [clientCredentials],
  healthChecks: [service, school, quota],
} satisfies AppDefinition;
