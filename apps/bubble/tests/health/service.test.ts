import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

function summary(mainStatus: string) {
  return {
    page: { id: "p1", name: "Bubble" },
    status: { indicator: "none", description: "All Systems Operational" },
    components: [
      { name: "Bubble Forum", status: "operational" },
      { name: "Main Bubble Environment", status: mainStatus },
    ],
  };
}

Deno.test("service: reads the Main Bubble Environment component", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: summary("operational") }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://status.bubble.io/api/v2/summary.json");
});

Deno.test("service: a major outage on that component is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("major_outage") }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: partial/degraded states are degraded, not down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: summary("partial_outage") }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: falls back to the page indicator if the component is gone", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { id: "p1", name: "Bubble" },
      status: { indicator: "none", description: "ok" },
      components: [],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: an unreachable status page is unknown, not down", async () => {
  const { ctx } = mockCtx([]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page whose name is not Bubble is treated as an unexpected shape", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      page: { id: "p1", name: "SomethingElse" },
      status: { indicator: "none" },
      components: [],
    },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: is app-scoped, unsigned, and degraded by default", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
});
