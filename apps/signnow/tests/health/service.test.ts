import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: ok when the API component is operational", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "Web", status: "operational" },
          { name: "API", status: "operational" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.api.state, "ok");
});

Deno.test("service: degraded when the API component alone is degraded", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "minor", description: "Partial outage" },
        components: [
          { name: "Web", status: "operational" },
          { name: "API", status: "partial_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("service: unaffected by an unrelated component's outage", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        status: { indicator: "major", description: "Payments degraded" },
        components: [
          { name: "API", status: "operational" },
          { name: "Payments", status: "major_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: falls back to the page rollup when no API component is found", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { status: { indicator: "none", description: "ok" }, components: [] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: hits status.signnow.com, unsigned", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { status: { indicator: "none" }, components: [] } },
  ]);
  await service.check!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "status.signnow.com");
  assertEquals(calls[0].headers["authorization"], undefined);
});
