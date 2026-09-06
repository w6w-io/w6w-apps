/**
 * How much of this account's SendPulse email plan is left?
 *
 * `GET /user/balance/detail` returns both dimensions that actually stop
 * sending, in one call:
 *
 *  - `email.maximum_subscribers` / `email.current_subscribers` — a
 *    subscription plan's contact-count ceiling. Zero or missing means
 *    "no subscriber-count plan" (a pay-as-you-go account has none), so it is
 *    reported as unmetered rather than as exhausted — the same rule
 *    `apify`'s quota check uses for a limit set by the account rather than
 *    the vendor.
 *  - `email.emails_left` — the pay-as-you-go send balance. There is no
 *    ceiling to compute a percentage against (it only ever counts down from
 *    whatever was last purchased), so this is reported as a bare reading
 *    rather than a fraction; it only worsens the verdict at exactly zero,
 *    where sending genuinely stops.
 *
 * Both read from the same response as `balance-get` reads a coarser summary
 * of, but at a different path — `/balance` (used for the credential probe in
 * `auth/client-credentials.ts`) carries only the overall currency balance,
 * not the per-service breakdown this check needs.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_HOST } from "../lib/client.ts";

export const DETAIL_URL = `${API_HOST}/user/balance/detail`;

/** Consumption at or above this fraction of the subscriber ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface DetailBody {
  email?: {
    emails_left?: number;
    maximum_subscribers?: number;
    current_subscribers?: number;
  };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Email plan headroom",
  description: "Subscriber-count ceiling and pay-as-you-go email balance, read from " +
    "GET /user/balance/detail.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(DETAIL_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return {
        state: "unknown",
        message: `SendPulse returned ${res.status} for /user/balance/detail`,
      };
    }

    const body = await res.json().catch(() => null) as DetailBody | null;
    const email = body?.email;
    if (!email) return { state: "unknown", message: "balance response carried no `email` block" };

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    const { maximum_subscribers: max, current_subscribers: current } = email;
    if (typeof max === "number" && typeof current === "number" && max > 0) {
      quotas.push({
        id: "subscribers",
        limit: max,
        remaining: Math.max(0, max - current),
        unit: "subscribers",
      });
      const fraction = current / max;
      if (fraction >= 1) {
        state = "down";
        notes.push(`subscribers at ${current}/${max} (100%)`);
      } else if (fraction >= WARN_FRACTION) {
        state = "degraded";
        notes.push(`subscribers at ${current}/${max} (${Math.round(fraction * 100)}%)`);
      }
    }

    if (typeof email.emails_left === "number") {
      quotas.push({ id: "emails-left", remaining: email.emails_left, unit: "emails" });
      if (email.emails_left <= 0) {
        state = "down";
        notes.push("no pay-as-you-go email credit left");
      }
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "balance response carried no known quota dimension" };
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
