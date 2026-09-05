/**
 * How much of this account's Knack API allowance is left?
 *
 * ## Two ceilings, both read from response headers — never from a dedicated endpoint
 *
 * `docs.knack.com/reference/api-limits` documents two limits and the headers
 * that report them:
 *
 *  - **Daily plan limit** — 1,000/5,000/10,000/25,000 requests per day by
 *    plan (Starter/Pro/Corporate/Plus). Reported as
 *    `X-PlanLimit-Limit`, `X-PlanLimit-Remaining`,
 *    `X-PlanLimit-Reset` (**milliseconds remaining** until reset at midnight
 *    GMT — not an epoch timestamp).
 *  - **Per-second rate limit** — 10 requests/second, every plan alike.
 *    Reported as `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
 *    `X-RateLimit-Reset` (an **epoch-seconds** timestamp — a different unit
 *    from the plan-limit reset above, which is why they are converted to
 *    `resetAt` differently below).
 *
 * ## What could not be confirmed, and how this check stays honest about it
 *
 * The vendor's worked example shows both header groups alongside a `429`
 * response, but a separate section — "Checking the Remaining API Request
 * Limit" — frames `X-PlanLimit-Remaining` as something you read at any time to
 * monitor usage, which reads as "present on ordinary responses too". This
 * could not be confirmed against a live account (no credentials to test
 * with), so this check does **not** assume the headers are always there: it
 * reads whatever is actually present and reports `state: "unknown"` — never a
 * guessed number — when neither header pair shows up.
 *
 * ## Same endpoint the credential probe uses, for the same reason
 *
 * Knack's API has no endpoint reachable without an Object key (see
 * `lib/client.ts`), so this reuses the `testObject` the Auth method
 * collected and republished on the Connection's `display` — never the
 * credential itself, which this hook never sees (the request is signed by the
 * host before it goes out, exactly like an Action's).
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE, API_PREFIX, encodeKey } from "../lib/client.ts";

interface KnackConnectionDisplay {
  testObject?: unknown;
}

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

function num(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function worsen(current: HealthState, next: HealthState): HealthState {
  return RANK[next] > RANK[current] ? next : current;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "API plan & rate limit headroom",
  description:
    "Reads X-PlanLimit-* (daily plan cap) and X-RateLimit-* (10 requests/second on every plan) " +
    "response headers from a minimal record read, per docs.knack.com/reference/api-limits.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as KnackConnectionDisplay;
    const objectKey = typeof display.testObject === "string" && display.testObject
      ? display.testObject
      : undefined;
    if (!objectKey) {
      return {
        state: "unknown",
        message: "connection records no test Object key to read headroom from — reconnect it",
      };
    }

    const path = `${API_PREFIX}/objects/${encodeKey(objectKey)}/records`;
    const res = await ctx.fetch(`${API_BASE}${path}?rows_per_page=1`, {
      headers: { accept: "application/json" },
    });

    const planLimit = num(res.headers.get("x-planlimit-limit"));
    const planRemaining = num(res.headers.get("x-planlimit-remaining"));
    const planResetMs = num(res.headers.get("x-planlimit-reset"));
    const rateLimit = num(res.headers.get("x-ratelimit-limit"));
    const rateRemaining = num(res.headers.get("x-ratelimit-remaining"));
    const rateResetEpochSeconds = num(res.headers.get("x-ratelimit-reset"));

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    if (planLimit !== undefined && planRemaining !== undefined) {
      quotas.push({
        id: "daily-plan-limit",
        limit: planLimit,
        remaining: Math.max(0, planRemaining),
        unit: "requests/day",
        ...(planResetMs !== undefined
          ? { resetAt: new Date(Date.now() + planResetMs).toISOString() }
          : {}),
      });
      const fraction = planLimit > 0 ? (planLimit - planRemaining) / planLimit : 0;
      if (fraction >= 1) {
        state = worsen(state, "down");
        notes.push(`daily plan limit exhausted (${planRemaining}/${planLimit} left)`);
      } else if (fraction >= 0.9) {
        state = worsen(state, "degraded");
        notes.push(
          `daily plan limit at ${Math.round(fraction * 100)}% (${planRemaining}/${planLimit} left)`,
        );
      }
    }

    if (rateLimit !== undefined && rateRemaining !== undefined) {
      quotas.push({
        id: "per-second-rate-limit",
        limit: rateLimit,
        remaining: Math.max(0, rateRemaining),
        unit: "requests/second",
        ...(rateResetEpochSeconds !== undefined
          ? { resetAt: new Date(rateResetEpochSeconds * 1000).toISOString() }
          : {}),
      });
      // Recovers within a second — never worse than degraded on its own.
      if (rateRemaining <= 0) {
        state = worsen(state, "degraded");
        notes.push("per-second rate limit exhausted; recovers within a second");
      }
    }

    if (res.status === 429) {
      const text = await res.text().catch(() => "");
      state = worsen(state, /plan limit/i.test(text) ? "down" : "degraded");
      notes.push(`Knack answered 429: ${text || "rate limit exceeded"}`);
    }

    if (quotas.length === 0) {
      return {
        state: "unknown",
        message: "response carried none of Knack's X-PlanLimit-*/X-RateLimit-* headers — " +
          "unconfirmed whether this account sends them outside a 429",
      };
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      quota: quotas,
      ttlSeconds: 60,
    };
  },
};

export default quota;
