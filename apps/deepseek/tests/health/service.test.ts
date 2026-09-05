import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service, { STATUS_HOST, STATUS_URL } from "../../health/service.ts";

Deno.test("service: declares kind=service and widens egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, [STATUS_HOST]);
  assertEquals(STATUS_URL, `https://${STATUS_HOST}/api/v2/summary.json`);
});

Deno.test("service: reports ok with per-component detail when the indicator is none", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "API 服务 (API Service)", status: "operational" },
          { name: "网页对话服务 (Web Chat Service)", status: "operational" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(report.state, "ok");
  assertEquals(Object.keys(report.components ?? {}).length, 2);
  assertEquals(Object.values(report.components ?? {}).every((c) => c.state === "ok"), true);
});

Deno.test("service: maps a major outage to down", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "major", description: "Major outage" },
        components: [{ name: "API Service", status: "major_outage" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["api-service"]?.state, "down");
});

Deno.test("service: a failing status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
