import { assert, assertEquals } from "@std/assert";
import service, {
  componentKey,
  mapComponentStatus,
  mapIndicator,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Trimmed shape of the live response measured 2026-08-30 (63 components). */
function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "wdsmhz9rfstt", name: "Teachable", url: "https://www.teachablestatus.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "kql9z1svn4dl", name: "developers.teachable.com", status: "operational", group: false },
      { id: "dy4270qyp12s", name: "teachable.com", status: "operational", group: false },
      {
        id: "33whzqxth002",
        name: "Accepting & Processing Payments",
        status: "operational",
        group: true,
      },
      {
        id: "8w55cng6lfxs",
        name: "BackOffice",
        status: "operational",
        group: false,
        group_id: "33whzqxth002",
      },
    ],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("service: probes the status host, not the API host", () => {
  assertEquals(STATUS_URL, "https://www.teachablestatus.com/api/v2/summary.json");
  assertEquals(service.network?.allow, ["www.teachablestatus.com"]);
  assertEquals(service.credential, "none");
});

Deno.test("service: an all-operational page reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
});

Deno.test("service: the API host component is reported by name", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.components?.kql9z1svn4dl?.message, "developers.teachable.com");
});

Deno.test("service: group containers are excluded from the component report", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).length, 3);
  assertEquals("33whzqxth002" in (report.components ?? {}), false);
});

Deno.test("service: an incident on the API host is reported degraded, not ok", async () => {
  const body = summary({ status: { indicator: "major", description: "Elevated API errors" } });
  body.components[0].status = "major_outage";

  const { ctx } = mockCtx([{ body }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.kql9z1svn4dl?.state, "down");
  assert(/developers\.teachable\.com \(major_outage\)/.test(report.message ?? ""), report.message);
});

Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a page with no components reports unknown", async () => {
  const { ctx } = mockCtx([{ body: summary({ components: [] }) }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** Guards a redirect/rebrand silently pointing this probe at someone else's page. */
Deno.test("service: a page that stops self-identifying as Teachable's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({ page: { id: "x", name: "Somebody Else", url: "https://status.other.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/self-identifies/.test(report.message ?? ""), report.message);
});

Deno.test("service: Statuspage's component vocabulary maps to the four health states", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: the page indicator maps to the four health states", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: componentKey prefers the vendor id and falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc", name: "API" }, 0), "abc");
  assertEquals(componentKey({ name: "Log In" }, 3), "log-in-3");
  assertEquals(componentKey({}, 7), "component-7");
});

Deno.test("service: with no indicator the verdict is the worst component", async () => {
  const body = summary({ status: undefined });
  body.components[1].status = "major_outage";
  const { ctx } = mockCtx([{ body }]);

  assertEquals((await service.check!({}, ctx)).state, "down");
});
