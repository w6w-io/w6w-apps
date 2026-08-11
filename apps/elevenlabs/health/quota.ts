/**
 * How much of this account's ElevenLabs plan is left?
 *
 * ## Why this is a real probe and not a declared absence
 *
 * ElevenLabs meters two completely different things, and only one of them is
 * readable in advance:
 *
 *  1. **Request rate and concurrency** — enforced purely by refusal. A `429`
 *     carries `rate_limit_exceeded` or `concurrent_limit_exceeded`, and nothing
 *     on the wire says how close you were beforehand. Measured live on
 *     2026-08-11, an `api.elevenlabs.io` response carried `date`,
 *     `content-type`, `content-length`, `vary`, the CORS set,
 *     `strict-transport-security`, `x-trace-id`, `x-region`, `via` and
 *     `alt-svc` — and **no** `X-RateLimit-*` header of any kind. That half is
 *     declared unavailable in `health/request-rate.ts`.
 *  2. **Plan consumption** — the character/credit allowance for the billing
 *     period, plus the voice-slot and voice-edit ceilings.
 *     `GET /v1/user/subscription` returns the limit *and* the current figure for
 *     every one of them, in one call.
 *
 * The second is the one that actually stops work: an account that exhausts
 * `character_limit` without overage entitlement gets a `402 payment_required`
 * on the next generation, and a workflow that synthesises audio hourly will find
 * that out at 03:00 rather than at review time. So this check reads it.
 *
 * ## Same endpoint as the credential probe, on purpose
 *
 * `auth/api-key.ts` probes `/v1/user/subscription` too. That is deliberate
 * rather than duplication: it is the endpoint that requires a credential,
 * returns no credential material, and reports headroom — which makes it
 * simultaneously the right liveness probe and the only source of headroom.
 * `minIntervalSeconds` keeps the cost to one call a minute.
 *
 * ## Two readings that would be wrong
 *
 * **Overage is not exhaustion.** `can_extend_character_limit` says the workspace
 * is entitled to usage-based billing, and `max_credit_limit_extension` says by
 * how much (`"unlimited"` for no cap, `0` for disabled). An account at 100% of
 * `character_limit` with overage enabled keeps working and is billed for it — so
 * it is reported `degraded`, not `down`. Only an account at its limit that
 * *cannot* extend has actually stopped.
 *
 * **A zero or missing ceiling is not zero headroom.** `max_voice_add_edits` is
 * nullable, and a non-positive limit means "not metered", not "exhausted".
 * Reading it the other way would report every unmetered account as dead.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const SUBSCRIPTION_URL = `${API_BASE}/v1/user/subscription`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface SubscriptionBody {
  tier?: string;
  status?: string;
  character_count?: number;
  character_limit?: number;
  can_extend_character_limit?: boolean;
  max_credit_limit_extension?: number | string;
  next_character_count_reset_unix?: number | null;
  voice_slots_used?: number;
  voice_limit?: number;
  voice_add_edit_counter?: number;
  max_voice_add_edits?: number | null;
}

/** Worst-first, matching `HEALTH_STATE_RANK` in `@w6w/types`. */
const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface DimensionReading {
  quota: HealthQuota;
  state: HealthState;
  /** Set only when the dimension is at or over the warning threshold. */
  note?: string;
}

/**
 * Turn one metered dimension into a quota reading plus the state it implies.
 *
 * Exported so the arithmetic is testable without a fetch — it is the part that
 * decides whether an account gets told it is about to stop working.
 *
 * `exhaustedIsDown` is what encodes the overage rule: characters run out into a
 * refusal only when the workspace cannot extend, while voice slots are a
 * ceiling you sit at rather than an outage.
 */
export function readDimension(
  id: string,
  used: number | undefined,
  limit: number | undefined | null,
  unit: string,
  exhaustedIsDown: boolean,
  resetAt?: string,
): DimensionReading | undefined {
  if (typeof used !== "number" || typeof limit !== "number") return undefined;

  const quota: HealthQuota = {
    id,
    limit,
    // Never negative: an account can be billed slightly past a ceiling before
    // it is stopped, and a negative "remaining" renders as nonsense.
    remaining: Math.max(0, limit - used),
    unit,
    ...(resetAt ? { resetAt } : {}),
  };

  // A non-positive ceiling is "not metered", not "exhausted".
  if (limit <= 0) return { quota, state: "ok" };

  const fraction = used / limit;
  const pct = Math.round(fraction * 100);
  if (fraction >= 1) {
    return {
      quota,
      state: exhaustedIsDown ? "down" : "degraded",
      note: `${id} at ${used}/${limit} ${unit} (${pct}%)`,
    };
  }
  if (fraction >= WARN_FRACTION) {
    return { quota, state: "degraded", note: `${id} at ${used}/${limit} ${unit} (${pct}%)` };
  }
  return { quota, state: "ok" };
}

/**
 * Can this workspace keep generating past `character_limit`?
 *
 * `can_extend_character_limit` is the entitlement and `max_credit_limit_extension`
 * is the size of it — documented as `"unlimited"` for no cap and `0` for
 * usage-based billing switched off. Both have to say yes.
 */
export function canOverage(body: SubscriptionBody): boolean {
  if (body.can_extend_character_limit !== true) return false;
  const max = body.max_credit_limit_extension;
  if (max === "unlimited") return true;
  return typeof max === "number" && max > 0;
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  description:
    "Character/credit allowance for the current billing period, plus voice slots and voice " +
    "add/edit allowance, read from GET /v1/user/subscription.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(SUBSCRIPTION_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A 403 here means a scoped key cannot read the subscription — that says
      // nothing about headroom, so it is `unknown`, not `degraded`.
      return {
        state: "unknown",
        message: `ElevenLabs returned ${res.status} for /v1/user/subscription`,
      };
    }

    const body = await res.json().catch(() => null) as SubscriptionBody | null;
    if (!body || typeof body.character_limit !== "number") {
      return { state: "unknown", message: "Subscription response carried no character_limit" };
    }

    const reset = typeof body.next_character_count_reset_unix === "number"
      ? new Date(body.next_character_count_reset_unix * 1000).toISOString()
      : undefined;

    const readings = [
      readDimension(
        "characters",
        body.character_count,
        body.character_limit,
        "characters",
        !canOverage(body),
        reset,
      ),
      readDimension("voice-slots", body.voice_slots_used, body.voice_limit, "voices", false),
      readDimension(
        "voice-add-edits",
        body.voice_add_edit_counter,
        body.max_voice_add_edits,
        "edits",
        false,
      ),
    ].filter((r): r is DimensionReading => r !== undefined);

    if (readings.length === 0) {
      return { state: "unknown", message: "Subscription response carried no known dimensions" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";
    for (const reading of readings) {
      quotas.push(reading.quota);
      if (reading.note) notes.push(reading.note);
      if (RANK[reading.state] > RANK[state]) state = reading.state;
    }

    if (state !== "ok" && canOverage(body)) {
      notes.push(
        "usage-based billing is enabled, so generation continues and is billed as overage",
      );
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
