/**
 * Is Vapi up?
 *
 * ## Finding the real status page
 *
 * Checked live on 2026-09-06:
 *
 *  - **`vapi.statuspage.io`** — the unclaimed-Statuspage decoy: a plain `302`
 *    to statuspage.io's own marketing page.
 *  - **`status.vapi.ai/api/v2/summary.json`** (the Statuspage-shaped path a
 *    reader would try first) — a `301` back to the page's own HTML shell.
 *    This page is Better Stack, not Statuspage-compatible, despite the
 *    Statuspage-style subdomain.
 *  - **`status.vapi.ai/index.json`** — Better Stack's own JSON document,
 *    `200`, self-identifying:
 *
 *        "data": {"type": "status_page", "attributes": {
 *           "company_name": "Vapi", "company_url": "https://vapi.ai",
 *           "custom_domain": "status.vapi.ai",
 *           "aggregate_state": "operational"}}
 *
 *    (served with `content-type: text/html; charset=utf-8` despite being a
 *    JSON document — a Better Stack quirk also seen on other pages in this
 *    pack; the body is parsed as JSON regardless of the header.)
 *
 * ## Two sections, and only one is Vapi's own infrastructure
 *
 * The page lists resources across two sections. The first (unnamed) section
 * is Vapi's own stack — `Vapi API` (`explanation: "api.vapi.ai"`), `Vapi EU
 * API`, `Vapi Dashboard`, `Vapi Auth`, `Vapi SIP`, per-carrier inbound/outbound
 * legs (Twilio, Telnyx, Vonage, SIP), and `Vapi Call Logs`. The second,
 * explicitly named **"Providers"**, lists the upstream model/voice vendors
 * Vapi depends on (OpenAI, Anthropic, Deepgram, ElevenLabs, Cartesia, Daily.co,
 * Gladia, Soniox, Google Gemini) — genuinely upstream, so they are reported,
 * but keeping them under their own vendor name (not "Vapi") stops a reader
 * from mistaking an OpenAI incident for a Vapi one. Several of these
 * (Anthropic, Google Gemini, Gladia) are `not_monitored` rather than
 * `operational` — mapped to `unknown`, not `ok`, since Vapi is not actively
 * watching them.
 *
 * ## Roll-up
 *
 * `data.attributes.aggregate_state` is the page's own verdict across every
 * resource, including "Providers" — trusted as the primary signal, exactly as
 * this pack's other Better Stack integrations do (see `apps/feedly`). Per-
 * resource detail is still reported for anyone who needs to know WHICH leg is
 * down.
 */
import type { HealthCheckDefinition, HealthComponentReport, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

export const STATUS_URL = "https://status.vapi.ai/index.json";

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

/** Better Stack's resource vocabulary, shared pack-wide (see `apps/feedly`, `apps/baserow`). */
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
    // "not_monitored" and anything unrecognised: Vapi states no verdict, so
    // this check states none either.
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
  title: "Vapi platform status",
  description:
    "Resource status from status.vapi.ai (Better Stack): Vapi's own API/dashboard/auth/SIP/" +
    "carrier legs, plus the upstream model and voice providers it depends on.",
  kind: "service",
  scope: "app",
  credential: "none",
  covers: ["*"],
  network: { allow: ["status.vapi.ai"] },
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(STATUS_URL, { headers: { accept: "application/json" } });
    if (!res.ok) {
      // A broken status page says nothing about Vapi — never `down`.
      return { state: "unknown", message: `Status page returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as BetterStackPage | null;
    if (!body?.data?.attributes) {
      return {
        state: "unknown",
        message: "Status page did not return its JSON document — the /index.json route may be gone",
      };
    }

    // Guard against a future redirect or rebrand silently pointing this probe
    // at somebody else's status page.
    const attrs = body.data.attributes;
    const identifies = /vapi/i.test(attrs.company_name ?? "") ||
      /vapi\.ai/i.test(attrs.company_url ?? "") ||
      /vapi\.ai/i.test(attrs.custom_domain ?? "");
    if (!identifies) {
      return { state: "unknown", message: "status page no longer self-identifies as Vapi's" };
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

    const aggregate = attrs.aggregate_state;
    const state = aggregate === undefined
      ? worstHealthState(Object.values(components).map((c) => c.state))
      : mapAggregateState(aggregate);

    const affected = resources.filter((r) => mapResourceStatus(r.attributes?.status) === "down");
    const notes: string[] = [];
    if (aggregate) notes.push(`aggregate: ${aggregate}`);
    if (affected.length > 0) {
      notes.push(
        `down: ${
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
