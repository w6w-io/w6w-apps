/**
 * Is TextMagic up? — Atlassian Statuspage.
 *
 * Verified live on 2026-09-05: `status.textmagic.com` is a genuine, currently
 * updated Statuspage instance (`page.name` reads `"Textmagic"`,
 * `page.url` `"https://status.textmagic.com"`) whose 9 components are the
 * product's own surfaces: `Web App`, `Sending text messages (Outbound SMS)`,
 * `Receiving text messages (Inbound SMS)`, `Email campaigns`,
 * `Email to SMS`, `SMS API Gateway`, `Voice services`, `Mobile App`, `Billing`.
 *
 * ## Two components drive this check; the other seven are reported for context
 *
 * `SMS API Gateway` is TextMagic's name for `rest.textmagic.com` — the exact
 * host every Action in this app calls — and `Sending text messages (Outbound
 * SMS)` is the channel this app's write path (`message-send`) actually
 * depends on. Between them they decide the top-level `state`; `Mobile App`,
 * `Billing`, `Voice services` and the rest are surfaced per-component only,
 * since a Mobile App outage says nothing about whether `message-send` works.
 *
 * - `kind: "service"` / `scope: "app"` (both defaults) — the answer is
 *   identical for every Connection.
 * - `credential: "none"` (default) — unauthenticated; reports even before
 *   anyone has connected.
 * - `status.textmagic.com` is deliberately NOT in the app's own
 *   `network.allow` — no Action has any reason to call it — and is widened
 *   here only, which is safe because this posture is unsigned.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_HOST = "status.textmagic.com";
export const STATUS_URL = `https://${STATUS_HOST}/api/v2/summary.json`;

/** The components that decide the top-level verdict. */
const PRIMARY_COMPONENTS = new Set([
  "sms api gateway",
  "sending text messages (outbound sms)",
]);

const COMPONENT: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  major_outage: "down",
  under_maintenance: "degraded",
};

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "TextMagic platform status",
  description:
    "Component status from status.textmagic.com, weighted on the SMS API Gateway and Sending " +
    "text messages (Outbound SMS) components — the two this app's traffic actually depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) return { state: "unknown", message: `Status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as {
      page?: { url?: string };
      components?: Array<{ id?: string; name?: string; status?: string }>;
      status?: { indicator?: string; description?: string };
    } | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.textmagic\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as TextMagic's" };
    }

    const nodes = (body.components ?? []).filter((c) => c?.name);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    const primaryStates: HealthState[] = [];
    for (const node of nodes) {
      const state = COMPONENT[node.status ?? ""] ?? "unknown";
      const key = node.id ?? slug(node.name!);
      components[key] = state === "ok" ? { state, message: node.name } : {
        state,
        message: `${node.name}: ${node.status}`,
      };
      if (PRIMARY_COMPONENTS.has(node.name!.trim().toLowerCase())) primaryStates.push(state);
    }

    const state = primaryStates.length > 0
      ? worstHealthState(primaryStates)
      : (COMPONENT[body.status?.indicator ?? ""] ?? "unknown");

    const affected = nodes.filter((n) => (COMPONENT[n.status ?? ""] ?? "unknown") !== "ok");
    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
