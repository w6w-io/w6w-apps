import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: is an unsigned, app-scoped check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.process.st"]);
});

Deno.test("service: reports ok when the 'Process Street APIs' component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "Process Street Web Application", status: "operational" },
        { name: "Process Street APIs", status: "operational" },
      ],
    },
  }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.process.st/api/v2/summary.json");
  assertEquals(r.state, "ok");
});

Deno.test("service: a degraded API component reports degraded, ignoring the web app component", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "minor" },
      components: [
        { name: "Process Street Web Application", status: "major_outage" },
        { name: "Process Street APIs", status: "degraded_performance" },
      ],
    },
  }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "degraded");
});

Deno.test("service: missing component falls back to the page-level indicator", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "critical" }, components: [] } }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
});

Deno.test("service: a failed status API reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "unknown");
});
