/**
 * Is Baserow's hosted service up?
 *
 * ## Finding the real status page took three tries, and two of them were traps
 *
 * Checked on 2026-08-10:
 *
 *  1. **`status.baserow.io`** — does not resolve at all (curl exit 6, no DNS).
 *     The `.io` guess is wrong; the status page is on `.org`.
 *  2. **`status.baserow.org`** — a real, claimed **Better Stack** page, but its
 *     HTML is served for *every* path: `/summary.json`, `/history.atom`,
 *     `/api/v2/summary.json` and `/definitely-not-real-zzz.json` all return the
 *     identical **483,220-byte** document, md5 `92aac70439f4`. Every
 *     Statuspage-shaped path is a catch-all here, and treating any of them as an
 *     API would parse a web page as JSON forever.
 *  3. **`baserow.instatus.com`** — a *superseded* Instatus page that still
 *     answers with real component JSON. Its own `page.url` points at
 *     `status.baserow.org`, i.e. it knows it has been replaced. Reading it would
 *     mean trusting a status feed the vendor has moved off.
 *
 * The endpoint this check actually uses is **`status.baserow.org/index.json`**,
 * Better Stack's own JSON document for that page:
 *
 *   | Path                            | Status | Bytes   | Body                     |
 *   | ------------------------------- | ------ | ------- | ------------------------ |
 *   | `/index.json`                   | 200    | 49,528  | **JSON**, self-describing |
 *   | `/definitely-not-real-zzz.json` | 200    | 483,220 | the catch-all HTML       |
 *
 * Note what the discriminator is here, because it is *not* the usual one: this
 * page answers `200` to a nonsense path rather than `404`, so "the bogus sibling
 * is refused" cannot be the test. What separates them is that `/index.json`
 * returns a **different, smaller, JSON** payload that names the product, while
 * the nonsense path returns the same HTML as the home page. The check below
 * enforces exactly that — it requires the parsed body to be Better Stack's
 * `data.attributes` shape *and* to self-identify as Baserow, so the day the
 * `/index.json` route disappears this reports `unknown` rather than silently
 * reading a web page.
 *
 * It self-identifies unambiguously:
 *
 *     "data": { "type": "status_page", "attributes": {
 *        "company_name": "Baserow",
 *        "company_url": "https://baserow.io/",
 *        "custom_domain": "status.baserow.org",
 *        "aggregate_state": "operational" } }
 *
 * and its resources are Baserow's own, each naming the host it watches —
 * "Frontend (baserow.io)", "Backend API (api.baserow.io)", "Community forum",
 * "Background worker", "Task queue size".
 *
 * ## Why this check is `informational`, deliberately
 *
 * The page covers **Baserow's hosted service**. Baserow is open source (MIT
 * core) and shipped as a Docker image; a large share of installs are somebody's
 * own container on their own infrastructure, and for those Connections every
 * resource on that page is irrelevant. This check is `scope: "app"`, so it
 * cannot know which Connections are hosted and which are not.
 *
 * Left at the `degraded` default for `kind: "service"`, an incident on
 * baserow.io would pin every self-hosted tenant's App at `degraded` — a plain
 * untruth about their instance. This is the same call `apps/metabase` and
 * `apps/discourse` make, for the same reason. `informational` says what the
 * check is: real, useful, worth displaying, and not evidence about any
 * particular Connection.
 *
 * Nothing is lost for a self-hosted tenant: the derived `auth:database-token`
 * check probes *their* instance, per Connection.
 *
 * ## Posture
 *
 * `credential: "none"` — the default for `kind: "service"`, and load-bearing: a
 * third-party status host must never see the instance's database token.
 * `network.allow` is declared for this hook alone. That is technically redundant
 * while the App's own allowlist is `["*"]` (see `lib/client.ts` for why it has
 * to be), but it is written out so the intent survives if that is ever narrowed,
 * and so a reader of the manifest can see that this hook — and only this hook —
 * talks to `status.baserow.org`.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.baserow.org/index.json";

interface BetterStackResource {
  id?: string;
  type?: string;
  attributes?: {
    public_name?: string;
    explanation?: string;
    status?: string;
    availability?: number;
  };
}

interface BetterStackPage {
  data?: {
    type?: string;
    attributes?: {
      company_name?: string;
      company_url?: string;
      custom_domain?: string;
      aggregate_state?: string;
    };
  };
  included?: BetterStackResource[];
}

/**
 * Better Stack's resource vocabulary. Verified against the live page's
 * `status_page_resource` entries and Better Stack's status-page documentation:
 * `operational`, `degraded`, `downtime`, `maintenance`, plus `unknown` for a
 * resource with no recent data.
 */
export function mapResourceStatus(status: string | undefined): HealthState {
  switch (status) {
    case "operational":
    case "resolved":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

/** The page-level roll-up, `data.attributes.aggregate_state`. */
export function mapAggregateState(state: string | undefined): HealthState {
  switch (state) {
    case "operational":
      return "ok";
    case "degraded":
    case "maintenance":
      return "degraded";
    case "downtime":
    case "down":
      return "down";
    default:
      return "unknown";
  }
}

/** Slugify a resource's public name into a stable component key. */
export function resourceKey(resource: BetterStackResource, index: number): string {
  const name = resource.attributes?.public_name;
  if (name) return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return resource.id ?? `resource-${index}`;
}

const service: HealthCheckDefinition = {
  key: "service",
  title: "Baserow hosted status",
  description:
    "Resource status from status.baserow.org (Better Stack). Covers Baserow's hosted service — a " +
    "self-hosted instance is unaffected, which is why this check is informational and the " +
    "per-connection credential check carries the weight.",
  kind: "service",
  scope: "app",
  // Stated rather than left to the `kind: "service"` default. It is the
  // precondition for the `network` widening below — a check that reaches a
  // third-party host MUST be unsigned.
  credential: "none",
  covers: ["*"],
  severity: "informational",
  network: { allow: ["status.baserow.org"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Baserow — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    // This page serves HTML for unknown paths WITH a 200, so a parse failure is
    // the expected signal that the JSON route has gone away — not an anomaly.
    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — the /index.json route may be gone",
      };
    }

    // Guard against a future redirect or rebrand silently pointing this probe at
    // somebody else's status page: a healthy, claimed page belonging to an
    // entirely different product would otherwise read as good news.
    const attrs = body.data.attributes;
    const identifies = /baserow/i.test(attrs.company_name ?? "") ||
      /baserow\.(io|org)/i.test(attrs.company_url ?? "") ||
      /baserow\.(io|org)/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Baserow's" };
    }

    const resources = (body.included ?? []).filter((r) =>
      r.type === "status_page_resource" && r.attributes?.public_name
    );

    const components: Record<string, HealthComponentReport> = {};
    resources.forEach((resource, index) => {
      const state = mapResourceStatus(resource.attributes?.status);
      components[resourceKey(resource, index)] = state === "ok"
        ? { state }
        : { state, message: resource.attributes?.status };
    });

    // Prefer the vendor's own roll-up when it gives one; fall back to worst-of.
    const aggregate = attrs.aggregate_state;
    const state = aggregate === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapAggregateState(aggregate);

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) !== "ok");
    const notes: string[] = [];
    if (aggregate) notes.push(`aggregate: ${aggregate}`);
    if (affected.length > 0) {
      notes.push(
        `affected: ${
          affected.map((r) => `${r.attributes?.public_name} (${r.attributes?.status})`).join(", ")
        }`,
      );
    }

    return {
      state,
      message: notes.length > 0 ? notes.join("; ") : undefined,
      components: Object.keys(components).length > 0 ? components : undefined,
      ttlSeconds: 60,
    };
  },
};

export default service;
