/**
 * Is Twitch up?
 *
 * ## The status page is real, and it is NOT on the host you would guess
 *
 * **`status.twitch.tv` 302-redirects to `status.twitch.com`.** Measured
 * 2026-08-11: `GET https://status.twitch.tv/api/v2/status.json` answers
 * `302` with a 110-byte HTML body pointing at
 * `https://status.twitch.com/api/v2/status.json`. Every `curl -L` and every
 * fetch that follows redirects hides this, which is exactly how it becomes a
 * bug: a check declaring `status.twitch.tv` in its allowlist would be reaching
 * a host it never declared, because the runtime checks the hostname of the URL
 * it is *given*, not of the one the redirect lands on. The page's own
 * `page.url` says `https://status.twitch.com`, which settles it. This check
 * calls the `.com` host directly and declares exactly that host, and nothing
 * else. (Vimeo's `status.vimeo.com` → `www.vimeostatus.com` was the same trap
 * in the previous batch of apps.)
 *
 * ## Verified three ways on 2026-08-11
 *
 * **(a) Bogus sibling path — is this a catch-all?** No.
 *
 *   | Path (on `status.twitch.com`)          | Status  | Bytes | md5 (first 12) |
 *   | -------------------------------------- | ------- | ----- | -------------- |
 *   | `/api/v2/summary.json`                 | 200     | 2,057 | `4f6538f206a0` |
 *   | `/api/v2/status.json`                  | 200     |   212 | `1b69ad3cc92a` |
 *   | `/api/v2/definitely-not-real-zzz.json` | **404** | **0** | —              |
 *
 * Three different answers, and the nonsense path is refused outright.
 *
 * **(b) Content type AND body.** `application/json; charset=utf-8`, parsing as
 * the Statuspage v2 schema. Neither known unclaimed-host signature matches: an
 * unclaimed `*.statuspage.io` is ~127,700 B of HTML, an unclaimed
 * `*.instatus.com` ~216,800 B. This is 2,057 B of JSON.
 *
 * **(c) Does the page describe THIS product?** Yes:
 *
 *     "page": { "id": "yfj40zdsk34s", "name": "Twitch",
 *               "url": "https://status.twitch.com" }
 *
 * ## The six components, and the one that is missing
 *
 * The page carries exactly six components, none of them grouped:
 * `Login`, `Web`, `Chat`, `Video (Watching)`, `Video (Broadcasting)`,
 * `Purchases`. **There is no component for the Helix API.** A green page
 * therefore says nothing directly about `api.twitch.tv` — which is why this app
 * declares that gap explicitly in `health/api-status.ts` and probes Helix
 * itself in `health/api.ts`, rather than letting a green consumer-status page
 * imply an answer it does not contain.
 *
 * What it *does* say is still worth having: `Login` covers `id.twitch.tv`, the
 * authorization service every connection here depends on, and a `Login` outage
 * is the difference between "your token expired" and "nobody can get a token".
 *
 * ## Severity
 *
 * Left at the `degraded` default for `kind: "service"`. Twitch is SaaS-only, so
 * every connection this app can hold runs on exactly the infrastructure this
 * page describes.
 *
 * `credential: "none"` is the default for `kind: "service"` and is stated
 * explicitly because it is the precondition for the `network` widening below —
 * a status host must never see a Twitch token.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.twitch.com/api/v2/summary.json";

interface StatusComponent {
  id?: string;
  name?: string;
  status?: string;
  group?: boolean;
}

interface StatusSummary {
  page?: { id?: string; name?: string; url?: string };
  components?: StatusComponent[];
  incidents?: Array<{ name?: string; status?: string }>;
  scheduled_maintenances?: unknown[];
  status?: { indicator?: string; description?: string };
}

/**
 * Statuspage's documented component vocabulary: `operational`,
 * `degraded_performance`, `partial_outage`, `major_outage`,
 * `under_maintenance`.
 */
export function mapComponentStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
      return "ok";
    case "degraded_performance":
    case "partial_outage":
    case "under_maintenance":
      return "degraded";
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

/** The page-level roll-up: `none`, `minor`, `major`, `critical`, `maintenance`. */
export function mapIndicator(indicator: string | undefined): HealthState {
  switch (indicator) {
    case "none":
      return "ok";
    case "minor":
    case "major":
    case "maintenance":
      return "degraded";
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

/**
 * Key a component by the vendor's id, falling back to a slug of the name.
 *
 * The id is stable across renames and is what the page's own incident records
 * reference. The fallback exists only so a future page that drops ids still
 * reports something rather than silently dropping rows.
 */
export function componentKey(component: StatusComponent, index: number): string {
  if (component.id) return component.id;
  if (component.name) {
    const slug = component.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${slug}-${index}`;
  }
  return `component-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Twitch platform status",
  description:
    "Component status from status.twitch.com — Login, Web, Chat, Video (Watching), Video " +
    "(Broadcasting) and Purchases. Note that Twitch publishes no component for the Helix API " +
    "itself; see the `api-status` and `api` checks.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.twitch.com"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status API says nothing about Twitch — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as StatusSummary | null;
    if (!body) return { state: "unknown", message: "Status page returned an unreadable body" };

    // Guard against a future redirect or rebrand silently pointing this probe at
    // someone else's page — the failure mode where a healthy, claimed status
    // page belongs to an entirely different product. `status.twitch.tv` already
    // redirects here, so a URL check is not paranoia on this vendor.
    const pageUrl = body.page?.url ?? "";
    if (pageUrl && !/(^|\/\/|\.)status\.twitch\.com(\/|$)/i.test(pageUrl)) {
      return { state: "unknown", message: "status page no longer self-identifies as Twitch's" };
    }

    // `group: true` rows are containers whose status mirrors their children.
    // Twitch publishes none today, but filtering costs nothing and stops a
    // future regrouping from double-counting every component.
    const nodes = (body.components ?? []).filter((c) => c?.name && c.group !== true);
    if (nodes.length === 0) {
      return { state: "unknown", message: "Status page returned no components" };
    }

    const components: Record<string, HealthComponentReport> = {};
    nodes.forEach((node, index) => {
      const state = mapComponentStatus(node.status);
      // The name goes in the message even when healthy: the key is an opaque
      // vendor id, so without it a reader cannot tell which component this is.
      components[componentKey(node, index)] = state === "ok"
        ? { state, message: node.name }
        : { state, message: `${node.name}: ${node.status}` };
    });

    const indicator = body.status?.indicator;
    const state = indicator === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapIndicator(indicator);

    const affected = nodes.filter((n) => mapComponentStatus(n.status) !== "ok");
    const openIncidents = body.incidents?.length ?? 0;
    const maintenance = body.scheduled_maintenances?.length ?? 0;

    const notes: string[] = [];
    if (body.status?.description) notes.push(body.status.description);
    if (affected.length > 0) {
      notes.push(`affected: ${affected.map((n) => `${n.name} (${n.status})`).join(", ")}`);
    }
    if (openIncidents > 0) notes.push(`${openIncidents} open incident(s)`);
    if (maintenance > 0) notes.push(`${maintenance} scheduled maintenance window(s)`);

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components,
      ttlSeconds: 60,
    };
  },
};

export default service;
