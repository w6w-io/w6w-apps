import { assert, assertEquals } from "@std/assert";
import service, { API_COMPONENT_ID, mapComponentStatus } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

function summary(components: Array<Record<string, unknown>>, extra: Record<string, unknown> = {}) {
  return {
    page: { id: "p5c6ktq11259", name: "Recharge", url: "https://status.getrecharge.com" },
    components,
    incidents: [],
    scheduled_maintenances: [],
    ...extra,
  };
}

Deno.test("service: reports ok when the Recharge API component is operational", async () => {
  const { ctx } = mockCtx([
    {
      body: summary([
        { id: API_COMPONENT_ID, name: "Recharge API", status: "operational" },
        { id: "other", name: "Shopify Admin", status: "operational" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a Shopify-only degradation does not degrade this check", async () => {
  const { ctx } = mockCtx([
    {
      body: summary([
        { id: API_COMPONENT_ID, name: "Recharge API", status: "operational" },
        { id: "other", name: "Shopify Admin", status: "major_outage" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: reports down when the Recharge API component itself is down", async () => {
  const { ctx } = mockCtx([
    {
      body: summary([
        { id: API_COMPONENT_ID, name: "Recharge API", status: "major_outage" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message?.includes("Recharge API"));
});

Deno.test("service: reports degraded on partial_outage / degraded_performance", async () => {
  const { ctx } = mockCtx([
    { body: summary([{ id: API_COMPONENT_ID, name: "Recharge API", status: "partial_outage" }]) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: unknown, not down, when the status API itself errors", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown when the page no longer self-identifies as Recharge's", async () => {
  const { ctx } = mockCtx([
    {
      body: summary([{ id: API_COMPONENT_ID, name: "Recharge API", status: "operational" }], {
        page: { id: "x", name: "Someone Else", url: "https://status.example.com" },
      }),
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unknown when the Recharge API component disappears from the page", async () => {
  const { ctx } = mockCtx([
    { body: summary([{ id: "other", name: "Shopify Admin", status: "operational" }]) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("mapComponentStatus: covers the full Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("service: declares no credential and widens egress only to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.getrecharge.com"]);
});
