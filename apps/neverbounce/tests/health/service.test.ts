import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok when the NeverBounce component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "NeverBounce", status: "operational" },
        { name: "Sales", status: "major_outage" },
        { name: "Datanyze", status: "degraded_performance" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(new URL(calls[0].url).host, "status.zoominfo.com");
  assertEquals(report.state, "ok");
});

Deno.test("service: reports degraded when the NeverBounce component is degraded, ignoring unrelated products", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "major", description: "Enrich outage" },
      components: [
        { name: "NeverBounce", status: "degraded_performance" },
        { name: "Sales", status: "major_outage" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);
  // Would be "down" if this check mistakenly read the page-level indicator
  // instead of the NeverBounce component specifically.
  assertEquals(report.state, "degraded");
});

Deno.test("service: reports unknown when the NeverBounce component is missing from the page", async () => {
  const { ctx } = mockCtx([{
    body: { components: [{ name: "Sales", status: "operational" }] },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: reports unknown when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is app-scoped, unsigned, and allowlists only the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.zoominfo.com"]);
});
