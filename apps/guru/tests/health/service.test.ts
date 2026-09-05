import { assert, assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    page: { id: "241nygn31605", name: "Guru", url: "https://status.getguru.com" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { id: "1z4zqghsbjb3", name: "API", status: "operational", group: false, group_id: null },
      {
        id: "y95dv7ks8fvr",
        name: "Infrastructure",
        status: "operational",
        group: true,
        group_id: null,
      },
      {
        id: "5gy4lcs4zh3s",
        name: "Databases",
        status: "operational",
        group: false,
        group_id: "y95dv7ks8fvr",
      },
    ],
    incidents: [],
    scheduled_maintenances: [],
    ...overrides,
  };
}

Deno.test("mapComponentStatus: the Statuspage component vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
  assertEquals(mapComponentStatus("something-new"), "unknown");
});

Deno.test("mapIndicator: the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug", () => {
  assertEquals(componentKey({ id: "abc123", name: "API" }, 0), "abc123");
  assertEquals(componentKey({ name: "File Service API" }, 2), "file-service-api-2");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service: all-operational reports ok and skips the group row", async () => {
  const { ctx } = mockCtx([{ body: summary() }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assert(report.components);
  assert(!("y95dv7ks8fvr" in report.components!), "the group row must not be reported");
  assertEquals(report.components!["1z4zqghsbjb3"].state, "ok");
});

Deno.test("service: an affected component is named in the message", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({
        status: { indicator: "major", description: "Partial API outage" },
        components: [
          {
            id: "1z4zqghsbjb3",
            name: "API",
            status: "partial_outage",
            group: false,
            group_id: null,
          },
        ],
      }),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(report.message?.includes("API (partial_outage)"), report.message);
});

Deno.test("service: a non-200 status page response is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: undefined }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: an unreadable body is unknown", async () => {
  const { ctx } = mockCtx([{ body: "not json", headers: { "content-type": "text/plain" } }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page that no longer self-identifies as Guru's is unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: summary({ page: { id: "x", name: "Someone Else", url: "https://status.example.com" } }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned (credential: none) and widens egress only to its own status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.getguru.com"]);
  assertEquals(service.kind, "service");
});
