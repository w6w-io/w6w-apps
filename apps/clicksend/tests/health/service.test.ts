import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok when the REST API component is operational", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        page: { name: "ClickSend Service Status" },
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "REST API", status: "operational", group_id: "g1" },
          { name: "SMS", status: "operational", group_id: "g2" },
          { name: "Products", status: "operational", group_id: null },
        ],
      },
    },
  ]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["rest-api"].state, "ok");
  assertEquals(report.components?.["sms"].state, "ok");
  assertEquals(calls[0].url, "https://status.clicksend.com/api/v2/summary.json");
});

Deno.test("service: weights the REST API component over the page-wide indicator", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "minor", description: "Partial outage" },
        components: [
          { name: "REST API", status: "operational" },
          { name: "Voice", status: "major_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({} as never, ctx);
  // The API itself is fine even though the page-wide indicator is degraded
  // because Voice is down — a multi-channel app cares about the distinction.
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["voice"].state, "down");
});

Deno.test("service: falls back to the page-wide indicator if REST API is absent from the board", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "critical" },
        components: [{ name: "SMTP", status: "major_outage" }],
      },
    },
  ]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: reports unknown (never down) when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await service.check!({} as never, ctx);
  assertEquals(report.state, "unknown");
});
