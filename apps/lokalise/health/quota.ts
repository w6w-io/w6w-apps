/**
 * How much of this account's Lokalise plan is left?
 *
 * `GET /teams` returns, for every team the token can see, a `quota_usage` and
 * `quota_allowed` object covering users, keys (across all the team's
 * projects), projects, OTA traffic bytes and AI words consumed — the ceiling
 * *and* the current figure, in one call. `mau` (monthly active users, for the
 * Lokalise SDK) is in the same objects but documented `deprecated`, so it is
 * read but not reported as a dimension here.
 *
 * A token can belong to more than one team, so this check reads every team in
 * the response and reports the worst dimension across all of them — an
 * account with five healthy teams and one exhausted one is not `ok`.
 *
 * ## What a limit of zero, or an enormous one, means
 *
 * Lokalise's own example response shows `quota_allowed.projects: 99999999` on
 * an Essential-plan team — a ceiling so large it is functionally "no limit",
 * not a real number to divide by. Rather than special-case a magic constant
 * (which could change), a non-positive ceiling is treated as "not configured"
 * (matching the pattern used across this pack for vendor-side quotas), and any
 * positive ceiling is read as a genuine fraction — a team would need to
 * actually approach 99,999,999 projects to trip the warning, which is exactly
 * the intended behaviour.
 */
import type { HealthCheckDefinition, HealthQuota, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

export const TEAMS_URL = `${API_BASE}/teams`;

/** Consumption at or above this fraction of the ceiling is worth flagging. */
export const WARN_FRACTION = 0.9;

interface TeamQuota {
  team_id?: number;
  name?: string;
  quota_usage?: Record<string, number | undefined>;
  quota_allowed?: Record<string, number | undefined>;
}

interface TeamsBody {
  teams?: TeamQuota[];
}

/** The metered dimensions, field-for-field from the vendor's `Teams` schema. `mau` is excluded — deprecated. */
export const QUOTA_DIMENSIONS: Array<{ id: string; key: string; unit: string }> = [
  { id: "users", key: "users", unit: "users" },
  { id: "keys", key: "keys", unit: "keys" },
  { id: "projects", key: "projects", unit: "projects" },
  { id: "ota-traffic", key: "trafficBytes", unit: "bytes" },
  { id: "ai-words", key: "ai_words", unit: "words" },
];

const RANK: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };

export interface DimensionReading {
  quota: HealthQuota;
  state: HealthState;
  note?: string;
}

/** Turn one team + dimension into a quota reading plus the state it implies. */
export function readDimension(
  teamName: string,
  dimension: typeof QUOTA_DIMENSIONS[number],
  usage: Record<string, number | undefined>,
  allowed: Record<string, number | undefined>,
): DimensionReading | undefined {
  const limit = allowed[dimension.key];
  const used = usage[dimension.key];
  if (typeof limit !== "number" || typeof used !== "number") return undefined;

  const quota: HealthQuota = {
    id: `${dimension.id}:${teamName}`,
    limit,
    remaining: Math.max(0, limit - used),
    unit: dimension.unit,
  };

  if (limit <= 0) return { quota, state: "ok" };

  const fraction = used / limit;
  if (fraction >= 1) {
    return {
      quota,
      state: "degraded",
      note: `${teamName} ${dimension.id} at ${used}/${limit} ${dimension.unit} (100%)`,
    };
  }
  if (fraction >= WARN_FRACTION) {
    return {
      quota,
      state: "degraded",
      note: `${teamName} ${dimension.id} at ${used}/${limit} ${dimension.unit} (${
        Math.round(fraction * 100)
      }%)`,
    };
  }
  return { quota, state: "ok" };
}

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Plan headroom",
  description:
    "Users, keys, projects, OTA traffic and AI words consumed vs. allocated, per team, read from " +
    "GET /teams.",
  kind: "quota",
  scope: "connection",
  credential: "signed",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(TEAMS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      return { state: "unknown", message: `Lokalise returned ${res.status} for /teams` };
    }

    const body = await res.json().catch(() => null) as TeamsBody | null;
    const teams = body?.teams ?? [];
    if (teams.length === 0) {
      return { state: "unknown", message: "Account has no teams to read quota from" };
    }

    const quotas: HealthQuota[] = [];
    const notes: string[] = [];
    let state: HealthState = "ok";

    for (const team of teams) {
      const usage = team.quota_usage;
      const allowed = team.quota_allowed;
      if (!usage || !allowed) continue;
      const teamName = team.name ?? `team ${team.team_id ?? "?"}`;
      for (const dimension of QUOTA_DIMENSIONS) {
        const reading = readDimension(teamName, dimension, usage, allowed);
        if (!reading) continue;
        quotas.push(reading.quota);
        if (reading.note) notes.push(reading.note);
        if (RANK[reading.state] > RANK[state]) state = reading.state;
      }
    }

    if (quotas.length === 0) {
      return { state: "unknown", message: "No team carried a readable quota_usage/quota_allowed" };
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
