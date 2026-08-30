import { assertEquals } from "@std/assert";
import service, { componentKey, mapComponentStatus, mapIndicator } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapComponentStatus: covers the Statuspage vocabulary", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("degraded_performance"), "degraded");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("under_maintenance"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus(undefined), "unknown");
});

Deno.test("mapIndicator: covers the page-level roll-up vocabulary", () => {
  assertEquals(mapIndicator("none"), "ok");
  assertEquals(mapIndicator("minor"), "degraded");
  assertEquals(mapIndicator("major"), "degraded");
  assertEquals(mapIndicator("maintenance"), "degraded");
  assertEquals(mapIndicator("critical"), "down");
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("componentKey: prefers the vendor id, falls back to a slug", () => {
  assertEquals(componentKey({ id: "q6t3km7g8t1f", name: "API" }, 0), "q6t3km7g8t1f");
  assertEquals(componentKey({ name: "AWS ec2-us-east-1" }, 3), "aws-ec2-us-east-1-3");
  assertEquals(componentKey({}, 5), "component-5");
});

Deno.test("service.check: all-operational reports ok, keyed and messaged per component", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "VideoAsk", url: "https://status.videoask.com" },
        components: [
          { id: "c1", name: "API", status: "operational", group: false },
          { id: "c2", name: "Group", status: "operational", group: true },
        ],
        status: { indicator: "none" },
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components ?? {}), ["c1"]);
});

Deno.test("service.check: a degraded component surfaces in the message and the page indicator wins", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "VideoAsk", url: "https://status.videoask.com" },
        components: [{ id: "c1", name: "API", status: "partial_outage" }],
        status: { indicator: "minor" },
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assertEquals(result.message?.includes("API (partial_outage)"), true);
});

Deno.test("service.check: an unreachable status host reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503 }]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service.check: a page that no longer self-identifies as VideoAsk's reports unknown", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        page: { name: "Someone Else", url: "https://status.example.com" },
        components: [{ id: "c1", name: "API", status: "operational" }],
      },
    },
  ]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.videoask.com"]);
});
