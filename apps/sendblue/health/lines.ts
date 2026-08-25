import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Is THIS account's own line assignment healthy?
 *
 * `GET /api/v2/lines/state` (verified against
 * `api/resources/lines/methods/get_state`, 2026-08-25) returns a per-line
 * snapshot — `ONLINE`, `OFFLINE`, `DEGRADED`, or `UNKNOWN` — for every
 * Sendblue phone number assigned to the account. This is a *dependency*
 * check, not a `service` one: the vendor-wide status page says nothing about
 * whether this account's specific worker/line is reachable, and a shared or
 * grace-period line can degrade independently of any platform-wide incident.
 *
 * A `grace_period` assignment with `DEGRADED`/`OFFLINE` status is worth
 * surfacing separately from `ONLINE` because it usually means the line is
 * about to be reassigned or dropped — the kind of thing that silently breaks
 * an integration long before any status page would.
 *
 * An account with no assigned lines yet (a fresh connection before setup) is
 * reported `unknown`, not `down` — there is nothing broken, just nothing
 * assigned.
 */
function mapLineStatus(status: string | undefined): HealthState {
  switch (status) {
    case "ONLINE":
      return "ok";
    case "DEGRADED":
      return "degraded";
    case "OFFLINE":
      return "down";
    default:
      return "unknown";
  }
}

interface LineState {
  sendblue_number?: string;
  status?: string;
  assignment?: string;
}

interface LineStateResponse {
  data?: LineState[];
}

const lines: HealthCheckDefinition = {
  key: "lines",
  title: "Assigned line health",
  description: "Per-line ONLINE/OFFLINE/DEGRADED status for this account's Sendblue numbers, " +
    "from GET /api/v2/lines/state.",
  kind: "dependency",
  covers: ["*"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}/api/v2/lines/state`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      return { state: "unknown", message: `Sendblue returned ${res.status} for lines/state` };
    }
    const body = await res.json().catch(() => null) as LineStateResponse | null;
    const data = body?.data ?? [];
    if (data.length === 0) {
      return { state: "unknown", message: "no phone lines are assigned to this account yet" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    for (const line of data) {
      const number = line.sendblue_number ?? "unknown-line";
      const state = mapLineStatus(line.status);
      components[number] = {
        state,
        message: line.assignment ? `${line.status ?? "UNKNOWN"} (${line.assignment})` : line.status,
      };
    }

    const worst = Object.values(components).reduce<HealthState>((acc, c) => {
      const rank: Record<HealthState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
      return rank[c.state] > rank[acc] ? c.state : acc;
    }, "ok");

    return { state: worst, components, ttlSeconds: 60 };
  },
};

export default lines;
