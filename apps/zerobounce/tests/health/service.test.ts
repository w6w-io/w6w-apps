import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok when the API component is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "API", status: "operational" },
        { name: "API-US", status: "operational" },
        { name: "API-EU", status: "degraded_performance" },
        { name: "Website & Documents", status: "major_outage" },
      ],
    },
  }]);
  const report = await service.check!({}, ctx);

  assertEquals(new URL(calls[0].url).host, "status.zerobounce.net");
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["api"].state, "ok");
  assertEquals(report.components?.["api-us"].state, "ok");
  assertEquals(report.components?.["api-eu"].state, "degraded");
  // Unrelated components (Website, Stripe JS, Cloudflare PoPs) are ignored.
  assertEquals(Object.keys(report.components ?? {}).sort(), ["api", "api-eu", "api-us"]);
});

Deno.test("service: reports down when the default API component is in a major outage", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "major", description: "API outage" },
      components: [{ name: "API", status: "major_outage" }],
    },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: reports unknown when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is app-scoped, unsigned, and allowlists only the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.zerobounce.net"]);
});
