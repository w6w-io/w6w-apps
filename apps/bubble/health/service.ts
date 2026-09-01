import type { HealthCheckDefinition } from "@w6w/types";

interface StatuspageComponent {
  name: string;
  status: string;
}
interface StatuspageSummary {
  page: { name: string; id: string };
  status: { indicator: string; description: string };
  components: StatuspageComponent[];
}

/**
 * Is Bubble's own platform up? — `status.bubble.io`, a real Statuspage
 * instance confirmed 2026-09-01 (`page.name: "Bubble"`, `/api/v2/summary.json`
 * live, not the unclaimed-page decoy shape this pack has hit elsewhere).
 *
 * Every Bubble app — and so every Connection this app makes — runs on shared
 * Bubble infrastructure, unlike `gitea`'s truly self-hosted instances. The
 * component that answers "can apps serve their Data/Workflow API at all" is
 * **Main Bubble Environment**; the page also lists the Bubble Editor, the
 * community forum, imgix, Intercom and the AWS/Cloudflare infrastructure
 * groups Bubble itself depends on, none of which say anything about whether
 * an app's own API is reachable, so this check reads that one component
 * rather than the page's worst indicator.
 *
 * `network.allow` restates `status.bubble.io` for documentation even though
 * the app's own manifest allowlist is already `["*"]` (every Bubble app has
 * its own host) — this check never reaches a Connection's app at all.
 */
const service: HealthCheckDefinition = {
  key: "service",
  title: "Bubble platform status",
  description: "status.bubble.io's Main Bubble Environment component — the shared runtime every " +
    "Bubble app's Data and Workflow API depends on.",
  kind: "service",
  covers: ["*"],
  network: { allow: ["status.bubble.io"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    let res: Response;
    try {
      res = await ctx.fetch("https://status.bubble.io/api/v2/summary.json", {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "unknown", message: `could not reach status.bubble.io: ${String(err)}` };
    }
    if (!res.ok) {
      return { state: "unknown", message: `status.bubble.io returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as StatuspageSummary | null;
    if (!body?.page || body.page.name !== "Bubble" || !Array.isArray(body.components)) {
      return { state: "unknown", message: "status.bubble.io answered an unexpected shape" };
    }

    const main = body.components.find((c) => c.name === "Main Bubble Environment");
    if (!main) {
      // The component was renamed or removed — fall back to the page's own indicator
      // rather than claiming a component-level answer this run cannot see.
      const indicator = body.status.indicator;
      const state = indicator === "none" ? "ok" : indicator === "critical" ? "down" : "degraded";
      return {
        state,
        message:
          `${body.status.description} (page-level; "Main Bubble Environment" component not found)`,
      };
    }

    const state = main.status === "operational"
      ? "ok"
      : main.status === "major_outage"
      ? "down"
      : main.status === "under_maintenance"
      ? "ok"
      : "degraded";
    return { state, message: `Main Bubble Environment: ${main.status}` };
  },
};

export default service;
