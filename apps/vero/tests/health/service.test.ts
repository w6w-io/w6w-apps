import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: kind service, unsigned, widens egress only to status.getvero.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.getvero.com"]);
});

Deno.test("service: maps a fully-operational summary to ok with per-component detail", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        status: { indicator: "none", description: "All Systems Operational" },
        components: [
          { name: "Vero 1.0: Ingestion API", status: "operational" },
          { name: "Transactional emails", status: "operational" },
          { name: "Vero 1.0: UI", group: true, status: "operational" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.getvero.com/api/v2/summary.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.components?.["vero-1-0-ingestion-api"], { state: "ok" });
  assertEquals(report.components?.["transactional-emails"], { state: "ok" });
  // Group headers are skipped — they just restate their children's worst state.
  assertEquals(report.components?.["vero-1-0-ui"], undefined);
});

Deno.test("service: maps a major incident to down", async () => {
  const { ctx } = mockCtx([
    { body: { status: { indicator: "major", description: "Partial outage" }, components: [] } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: an unreachable status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
