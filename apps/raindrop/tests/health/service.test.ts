import { assert, assertEquals } from "@std/assert";
import service, { identifiesRaindrop, slug, STATE, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";
import type { HealthReport } from "@w6w/types";

/** The live payload's own shape, trimmed to the fields the check reads. */
function statusPayload(
  aggregate: string,
  resources: Array<{ name: string; status: string; explicit?: string | null }>,
) {
  return {
    data: {
      attributes: {
        company_name: "Raindrop.io",
        custom_domain: "status.raindrop.io",
        aggregate_state: aggregate,
      },
    },
    included: resources.map((r) => ({
      type: "status_page_resource",
      attributes: { public_name: r.name, status: r.status, explicit_status: r.explicit ?? null },
    })),
  };
}

const LIVE_COMPONENTS = [
  { name: "Website", status: "operational" },
  { name: "API", status: "operational" },
  { name: "Web app", status: "operational" },
  { name: "Search", status: "operational" },
  { name: "Thumbnails", status: "operational" },
];

/**
 * `index.json`, NOT `/api/v2/*`. Raindrop's page is Better Stack, so every
 * Statuspage-shaped path — including a nonsense one — answers the same
 * 511,148-byte HTML. Pinning the URL is what keeps a future edit from
 * "restoring" the Statuspage convention and silently getting HTML forever.
 */
Deno.test("service: probes the Better Stack index.json, not a Statuspage path", async () => {
  const { ctx, calls } = mockCtx([{ body: statusPayload("operational", LIVE_COMPONENTS) }]);
  await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(STATUS_URL, "https://status.raindrop.io/index.json");
  assert(!STATUS_URL.includes("/api/v2/"), "pointed at a Statuspage path this host does not serve");
});

Deno.test("service: an operational page reports ok with every component", async () => {
  const { ctx } = mockCtx([{ body: statusPayload("operational", LIVE_COMPONENTS) }]);
  const report = await service.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}), [
    "website",
    "api",
    "web-app",
    "search",
    "thumbnails",
  ]);
  // The API is named separately from the web app, which is the granularity a
  // caller of an API integration needs.
  assertEquals(report.components?.api.state, "ok");
});

/**
 * `aggregate_state` is the vendor's own roll-up and is the field to trust.
 * Deriving a verdict from the component list instead would let the thumbnail
 * renderer speak for the API.
 */
Deno.test("service: the verdict comes from aggregate_state, the components from the list", async () => {
  const { ctx } = mockCtx([{
    body: statusPayload("degraded", [
      { name: "API", status: "operational" },
      { name: "Thumbnails", status: "downtime" },
    ]),
  }]);
  const report = await service.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.api.state, "ok");
  assertEquals(report.components?.thumbnails.state, "down");
  assert(/Thumbnails/.test(report.message ?? ""), report.message);
});

/** An operator override wins over the measured status. */
Deno.test("service: explicit_status overrides the measured one", async () => {
  const { ctx } = mockCtx([{
    body: statusPayload("maintenance", [
      { name: "API", status: "operational", explicit: "maintenance" },
    ]),
  }]);
  const report = await service.check!({}, ctx) as HealthReport;

  assertEquals(report.components?.api.state, "degraded");
});

Deno.test("service: the Better Stack vocabulary maps as documented", () => {
  assertEquals(STATE, {
    operational: "ok",
    degraded: "degraded",
    // Planned work is not an outage, but it is not business as usual either.
    maintenance: "degraded",
    downtime: "down",
  });
  assertEquals(slug("Web app"), "web-app");
});

/**
 * A status page that itself fails says nothing about the vendor. `unknown`,
 * never `down` — reporting an outage there would be a lie.
 */
Deno.test("service: a failing status page is unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const report = await service.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "unknown");
  assert(/503/.test(report.message ?? ""), report.message);
});

/**
 * **The trap this app was built around.** Every unknown path on this host serves
 * the page's 511 KB of HTML with a 200. If `index.json` ever moves, the check
 * gets HTML — and must report `unknown` with a diagnosis rather than crashing or
 * inventing a verdict.
 */
Deno.test("service: an HTML body (the host's catch-all) is unknown with an explanation", async () => {
  const { ctx } = mockCtx([{ body: "<!DOCTYPE html><html>…511 KB…</html>", headers: {} }]);
  const report = await service.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "unknown");
  assert(/HTML/i.test(report.message ?? ""), report.message);
});

/**
 * The failure mode a naive check never sees: a healthy, *claimed* status page
 * that belongs to someone else after a rebrand or a domain change.
 */
Deno.test("service: a page that no longer self-identifies as Raindrop's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: {
        attributes: {
          company_name: "Someone Else",
          custom_domain: "status.example.com",
          aggregate_state: "operational",
        },
      },
      included: [],
    },
  }]);
  const report = await service.check!({}, ctx) as HealthReport;

  assertEquals(report.state, "unknown");
  assert(/self-identifies/i.test(report.message ?? ""), report.message);
});

Deno.test("service: identifiesRaindrop accepts either self-identification", () => {
  assertEquals(identifiesRaindrop({ company_name: "Raindrop.io" }), true);
  assertEquals(identifiesRaindrop({ custom_domain: "status.raindrop.io" }), true);
  assertEquals(identifiesRaindrop({ company_name: "Someone Else" }), false);
  assertEquals(identifiesRaindrop({}), false);
  assertEquals(identifiesRaindrop(undefined), false);
});

Deno.test("service: a page with no components is unknown", async () => {
  const { ctx } = mockCtx([{ body: statusPayload("operational", []) }]);
  assertEquals((await service.check!({}, ctx) as HealthReport).state, "unknown");
});

/**
 * The status host is widened for this hook alone, and the posture must be
 * unsigned — a third-party status host must never see a Raindrop token.
 */
Deno.test("service: widens egress to the status host only, unsigned", () => {
  assertEquals(service.network?.allow, ["status.raindrop.io"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
});
