import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * How many conversion credits does this account have left?
 *
 * ## What CloudConvert actually meters, and what it publishes
 *
 * CloudConvert charges **conversion credits** per completed task (the amount varies by
 * operation and file size), and `GET /v2/users/me` returns the current balance as a plain
 * `credits` integer — no ceiling alongside it, because the "limit" is whatever the
 * account's plan or last top-up granted, not a fixed number the API states. That is the
 * one quota dimension this app can read without spending anything: request-rate headroom
 * is a different, *unreadable* meter, covered separately in `health/request-rate.ts`.
 *
 * ## Needs `user.read` — a scope most job/task-only keys will not have
 *
 * This is the same limitation `auth/api-token.ts` documents for its own probe, in the
 * other direction: `user.read` is a *narrower* grant than `task.read`/`task.write`, so a
 * key created for running conversions may simply not carry it. A `403` here is reported
 * as `unknown`, never `degraded` — refusing to read the balance says nothing about
 * whether the balance is low.
 *
 * ## No vendor-stated warning threshold
 *
 * Unlike Apify's `maxMonthlyUsageUsd` (a ceiling the account owner sets and the API
 * echoes back), CloudConvert states no low-credit or zero-credit semantics at all beyond
 * "remaining conversion credits" — a plan can auto-renew, be pay-as-you-go, or simply run
 * out. {@link LOW_CREDIT_THRESHOLD} is this **app's own** conservative floor (below what
 * a single typical conversion costs), not a vendor-documented ceiling; it is called out
 * here so nobody mistakes it for one.
 */
export const USERS_ME_URL = `${API_BASE}${API_PREFIX}/users/me`;

/** This app's own floor, not a vendor-stated one — see the module doc. */
export const LOW_CREDIT_THRESHOLD = 10;

interface UsersMeBody {
  data?: { credits?: number };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Conversion credit balance",
  description:
    "Remaining conversion credits, read from GET /v2/users/me. Needs the user.read scope, " +
    "which a task-only API key will not have.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(USERS_ME_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // 403 here almost always means the key lacks user.read, not that credits are low.
      return {
        state: "unknown",
        message: `CloudConvert returned ${res.status} for GET /v2/users/me`,
      };
    }

    const body = await res.json().catch(() => null) as UsersMeBody | null;
    const credits = body?.data?.credits;
    if (typeof credits !== "number") {
      return { state: "unknown", message: "GET /v2/users/me carried no numeric credits field" };
    }

    const quotaReading = { id: "credits", remaining: Math.max(0, credits), unit: "credits" };

    if (credits <= 0) {
      return {
        state: "down",
        message: `0 conversion credits remaining`,
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }
    if (credits < LOW_CREDIT_THRESHOLD) {
      return {
        state: "degraded",
        message: `${credits} conversion credit(s) remaining — below this app's own ` +
          `${LOW_CREDIT_THRESHOLD}-credit buffer`,
        quota: [quotaReading],
        ttlSeconds: 60,
      };
    }
    return {
      state: "ok",
      message: `${credits} conversion credit(s) remaining`,
      quota: [quotaReading],
      ttlSeconds: 60,
    };
  },
};

export default quota;
