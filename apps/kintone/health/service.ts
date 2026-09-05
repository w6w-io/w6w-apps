import type { HealthCheckDefinition } from "@w6w/types";

interface StatuspageComponent {
  id: string;
  name: string;
  status: string;
}
interface StatuspageSummary {
  page: { name: string; id: string };
  status: { indicator: string; description: string };
  components: StatuspageComponent[];
}

/**
 * Is Kintone's own shared platform up? — `status.kintone.com`, a real
 * Statuspage instance confirmed 2026-09-05 against its own
 * `/api/v2/summary.json`: `page.name: "Kintone"`, `page.id: "53bp49z7s2n7"`,
 * serving from `status.kintone.com` directly (no redirect to the
 * `*.statuspage.io` alias needed).
 *
 * The page publishes exactly one component, "Availability" ("Availability on
 * kintone.com") — there is no per-region or per-feature breakdown to choose
 * between, so this reads that component when present and falls back to the
 * page-level indicator only if Kintone ever renames or removes it.
 *
 * Every Kintone tenant runs on this same shared platform — unlike `gitea`'s
 * genuinely self-hosted instances — so this is `scope: "app"` (one check
 * shared by every connection), and `site` is the check that answers whether
 * *this connection's own tenant* is reachable.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Kintone platform status",
  description: "status.kintone.com's Availability component — the shared runtime every tenant's " +
    "REST API depends on.",
  kind: "service",
  covers: ["*"],
  network: { allow: ["status.kintone.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch("https://status.kintone.com/api/v2/summary.json", {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach status.kintone.com: ${String(err)}` };
    }
    if (!res.ok) {
      return { state: "unknown", message: `status.kintone.com returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.page || body.page.name !== "Kintone" || !Array.isArray(body.components)) {
      return { state: "unknown", message: "status.kintone.com answered an unexpected shape" };
    }

    const availability = body.components.find((c) => c.name === "Availability");
    if (!availability) {
      // The component was renamed or removed — fall back to the page's own
      // indicator rather than claiming a component-level answer this run cannot see.
      const indicator = body.status.indicator;
      const state = indicator === "none" ? "ok" : indicator === "critical" ? "down" : "degraded";
      return {
        state,
        message: `${body.status.description} (page-level; "Availability" component not found)`,
      };
    }

    const state = availability.status === "operational"
      ? "ok"
      : availability.status === "major_outage"
      ? "down"
      : availability.status === "under_maintenance"
      ? "ok"
      : "degraded";
    return { state, message: `Availability: ${availability.status}` };
  },
};

export default service;
