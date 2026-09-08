import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("service: reports ok on indicator none", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      page: { name: "Livestorm" },
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ name: "Livestorm app", status: "operational" }],
    },
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(pathOf(calls[0].url), "/api/v2/summary.json");
});

Deno.test("service: maps major indicator to down", async () => {
  const { ctx } = mockCtx([{
    body: { status: { indicator: "major", description: "Partial outage" }, components: [] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: credential none, unsigned, scoped to the status host", () => {
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.livestorm.co"]);
});
