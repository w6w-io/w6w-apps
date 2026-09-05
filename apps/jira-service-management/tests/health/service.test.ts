import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

Deno.test("service: probes the JSM-specific Statuspage host, not the Jira Software one", () => {
  assertEquals(check.kind, "service");
  assertEquals(check.network?.allow, ["jira-service-management.status.atlassian.com"]);
});

Deno.test("service: maps the rollup indicator and per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "Jira Service Management Web", status: "operational" },
        { name: "Service Portal", status: "degraded_performance" },
      ],
    },
  }]);
  const out = await check.check!({}, ctx);
  assertEquals(
    calls[0].url,
    "https://jira-service-management.status.atlassian.com/api/v2/summary.json",
  );
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["jira-service-management-web"].state, "ok");
  assertEquals(out.components?.["service-portal"].state, "degraded");
});

Deno.test("service: unknown, never down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
