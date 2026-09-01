import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: ok when Statuspage reports indicator none", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: { indicator: "none", description: "All Systems Operational" }, components: [] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, "https://status.freeagent.com/api/v2/summary.json");
});

Deno.test("service: degraded on a minor indicator, down on major/critical", async () => {
  const { ctx: c1 } = mockCtx([{ body: { status: { indicator: "minor" } } }]);
  assertEquals((await service.check!({}, c1)).state, "degraded");

  const { ctx: c2 } = mockCtx([{ body: { status: { indicator: "major" } } }]);
  assertEquals((await service.check!({}, c2)).state, "down");

  const { ctx: c3 } = mockCtx([{ body: { status: { indicator: "critical" } } }]);
  assertEquals((await service.check!({}, c3)).state, "down");
});

Deno.test("service: reports the per-component breakdown, skipping group headers", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "minor" },
      components: [
        { name: "API", status: "degraded_performance" },
        { name: "Group", status: "operational", group: true },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["api"]?.state, "degraded");
  assertEquals("group" in (report.components ?? {}), false);
});

Deno.test("service: unknown (never down) when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
