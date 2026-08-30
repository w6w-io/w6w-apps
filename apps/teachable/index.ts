/**
 * Teachable — the Public API (school-owner, API-key authenticated surface).
 *
 * Every path, verb, query parameter, body field and response shape here was
 * verified on 2026-08-30 against the OpenAPI 3.0.2 document Teachable's own
 * Readme.io-hosted reference embeds per-page (`docs.teachable.com/reference`,
 * `info.title` `teachable-public-api`), plus live probes against
 * `developers.teachable.com` and the vendor's prose guides
 * (`docs.teachable.com/docs/{authentication,rate-limits,pagination}`).
 *
 * Three findings that shaped this app, each documented in full where it
 * matters:
 *
 *  1. **The real API host is not the docs host** and the credential header is
 *     a literal `apiKey`, no `Bearer` prefix — see `lib/client.ts` and
 *     `auth/api-key.ts`.
 *  2. **The vendor's own docs disagree with themselves** on two numbers: the
 *     rate-limit guide states "100 requests per minute" but its own example
 *     429 response shows `RateLimit-Limit: 360`; the pagination guide says the
 *     default page size is 25, but individual endpoints' own OpenAPI
 *     descriptions say 20 (most) or 5 (`/pricing_plans`). See `lib/client.ts`.
 *  3. **Webhooks are read-only through this API.** There is no
 *     `POST /v1/webhooks` in the spec — a webhook is created and edited in the
 *     school admin UI; this app can only read what is already configured.
 *
 * ## Out of scope: the per-student OAuth2 surface
 *
 * The reference also documents a second, separate API under
 * `/v1/current_user/*` (a student's own profile, courses and progress),
 * secured by OAuth2 whose `authorizationUrl` is
 * `https://sso.teachable.com/secure/{school_id}/identity/oauth_provider/authorize`
 * — a per-school host, confirmed live in that page's embedded schema. This is
 * a materially different auth model and a different persona (an individual
 * student authorizing their own access, not the school owner managing the
 * school), so it is deliberately left out of this app rather than folded in as
 * a second Auth method: doing so would need a distinct connect flow, a
 * school-id field to build the authorize URL, and its own action surface, all
 * for a use case (student self-service) this app's admin-key surface does not
 * otherwise serve. Left for a follow-up app or a second Auth method if a
 * concrete workflow needs it.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import courseList from "./actions/course-list.ts";
import courseGet from "./actions/course-get.ts";
import courseEnrollmentsList from "./actions/course-enrollments-list.ts";
import courseProgressGet from "./actions/course-progress-get.ts";
import lectureGet from "./actions/lecture-get.ts";
import lectureMarkComplete from "./actions/lecture-mark-complete.ts";
import quizList from "./actions/quiz-list.ts";
import quizGet from "./actions/quiz-get.ts";
import quizResponsesGet from "./actions/quiz-responses-get.ts";
import videoGet from "./actions/video-get.ts";

import userCreate from "./actions/user-create.ts";
import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";
import userUpdate from "./actions/user-update.ts";
import userEnroll from "./actions/user-enroll.ts";
import userUnenroll from "./actions/user-unenroll.ts";

import webhookList from "./actions/webhook-list.ts";
import webhookEventsList from "./actions/webhook-events-list.ts";

import pricingPlanGet from "./actions/pricing-plan-get.ts";
import pricingPlanList from "./actions/pricing-plan-list.ts";

import transactionList from "./actions/transaction-list.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Courses & curriculum
    courseList,
    courseGet,
    courseEnrollmentsList,
    courseProgressGet,
    lectureGet,
    lectureMarkComplete,
    quizList,
    quizGet,
    quizResponsesGet,
    videoGet,
    // Users
    userCreate,
    userList,
    userGet,
    userUpdate,
    userEnroll,
    userUnenroll,
    // Webhooks (read-only)
    webhookList,
    webhookEventsList,
    // Pricing plans
    pricingPlanGet,
    pricingPlanList,
    // Transactions
    transactionList,
  ],
  // API key only. Teachable publishes no OAuth surface for a school owner
  // integration — see the module doc for why the separate per-student OAuth2
  // API is out of scope.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
