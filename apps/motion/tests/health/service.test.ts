import { assert, assertEquals } from "@std/assert";
import service, {
  ALL_UNMONITORED,
  identifiesMotion,
  slug,
  STATE,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** The payload `status.usemotion.com/index.json` actually returned on 2026-08-11. */
function payload(
  resources: Array<{ public_name: string; status: string; explicit_status?: string | null }>,
  attributes: Record<string, unknown> = {},
  reports: unknown[] = [],
): Record<string, unknown> {
  return {
    data: {
      id: "207043",
      type: "status_page",
      attributes: {
        company_name: "Motion",
        company_url: "https://usemotion.com",
        custom_domain: "status.usemotion.com",
        aggregate_state: "operational",
        ...attributes,
      },
      relationships: { status_reports: { data: reports } },
    },
    included: resources.map((r) => ({ type: "status_page_resource", attributes: r })),
  };
}

Deno.test("service: reads the one path on that host that answers with JSON", async () => {
  const { ctx, calls } = mockCtx([
    { body: payload([{ public_name: "Webapp", status: "operational" }]) },
  ]);
  await service.check!({}, ctx);

  // Everything Statuspage-shaped on this host 301s to `/`; /index.json is
  // Better Stack's own endpoint and the only machine-readable surface.
  assertEquals(calls[0].url, "https://status.usemotion.com/index.json");
  assertEquals(STATUS_URL, "https://status.usemotion.com/index.json");
});

/**
 * The measured state: one resource, `Webapp`, reporting `not_monitored`, with a
 * page-level `aggregate_state` of `operational`. That aggregate is a roll-up
 * over nothing, so reporting `ok` would present the absence of evidence as
 * evidence.
 */
Deno.test("service: an unmonitored-only page reports unknown, not ok", async () => {
  const { ctx } = mockCtx([
    { body: payload([{ public_name: "Webapp", status: "not_monitored" }]) },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes(ALL_UNMONITORED), report.message);
  assertEquals(report.components?.webapp.state, "unknown");
});

Deno.test("service: a monitored, operational page reports ok", async () => {
  const { ctx } = mockCtx([
    { body: payload([{ public_name: "Webapp", status: "operational" }]) },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.components?.webapp, { state: "ok", message: "Webapp" });
});

Deno.test("service: a component outage is reported per component and in the roll-up", async () => {
  const { ctx } = mockCtx([
    {
      body: payload([
        { public_name: "Webapp", status: "downtime" },
        { public_name: "API", status: "operational" },
      ], { aggregate_state: "downtime" }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assertEquals(report.components?.webapp.state, "down");
  assertEquals(report.components?.api.state, "ok");
  assert((report.message ?? "").includes("Webapp: downtime"), report.message);
});

/** An operator override wins over the measured status. */
Deno.test("service: explicit_status takes precedence", async () => {
  const { ctx } = mockCtx([
    {
      body: payload([
        { public_name: "Webapp", status: "operational", explicit_status: "maintenance" },
      ], { aggregate_state: "maintenance" }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.components?.webapp.state, "degraded");
  assertEquals(report.state, "degraded");
});

/**
 * The `status_reports` array was EMPTY when this was measured, so an entry's
 * shape is unverified — the check counts the relationship rather than reading
 * fields it has never seen.
 */
Deno.test("service: a published status report is counted, never parsed", async () => {
  const { ctx } = mockCtx([
    {
      body: payload([{ public_name: "Webapp", status: "operational" }], {}, [
        { id: "1", type: "status_report" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert((report.message ?? "").includes("1 status report(s) published"), report.message);
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const failing = mockCtx([{ status: 503, body: "nope" }]);
  assertEquals((await service.check!({}, failing.ctx)).state, "unknown");

  const html = mockCtx([{ status: 200, body: "<html>redirected to the page</html>" }]);
  const report = await service.check!({}, html.ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("index.json may have moved"), report.message);
});

Deno.test("service: a page that no longer names Motion reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: payload([{ public_name: "Webapp", status: "operational" }], {
        company_name: "Someone Else",
        custom_domain: "status.someoneelse.com",
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("self-identifies"), report.message);
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: payload([]) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: Better Stack's vocabulary maps as the roll-up needs", () => {
  assertEquals(STATE.operational, "ok");
  assertEquals(STATE.degraded, "degraded");
  assertEquals(STATE.downtime, "down");
  // Planned work is not an outage, but it is not business as usual either.
  assertEquals(STATE.maintenance, "degraded");
  // The absence of evidence, not evidence of health.
  assertEquals(STATE.not_monitored, "unknown");
  // Exactly Better Stack's five states, taken from the page's own icon symbols.
  // Anything unrecognised falls through to `unknown` at the call site rather
  // than being optimistically read as healthy.
  assertEquals(Object.keys(STATE).sort(), [
    "degraded",
    "downtime",
    "maintenance",
    "not_monitored",
    "operational",
  ]);
});

Deno.test("service: identifiesMotion accepts either self-identification and rejects neither", () => {
  assert(identifiesMotion({ company_name: "Motion" }));
  assert(identifiesMotion({ custom_domain: "status.usemotion.com" }));
  assert(!identifiesMotion({ company_name: "Acme", custom_domain: "status.acme.com" }));
  assert(!identifiesMotion(undefined));
  assert(!identifiesMotion({}));
});

Deno.test("service: slug keys a component readably", () => {
  assertEquals(slug("Webapp"), "webapp");
  assertEquals(slug("API (api.usemotion.com)"), "api-api-usemotion-com");
});

/**
 * The whole reason this check is `informational`: the page describes `Webapp`
 * and nothing covering `api.usemotion.com`, so it must never move a verdict
 * about the surface this app actually calls.
 */
Deno.test("service: is informational, unsigned, and widens egress to the status host only", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.network?.allow, ["status.usemotion.com"]);
});
