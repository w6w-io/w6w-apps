import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: maps the Statuspage indicator and per-component detail", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [
        { name: "FreshBooks", status: "operational" },
        { name: "FreshBooks Payments", status: "operational" },
        { name: "A Group Header", status: "operational", group: true },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.components?.["freshbooks"], { state: "ok" });
  assertEquals(out.components?.["a-group-header"], undefined);
  assertEquals(calls[0].url, "https://status.freshbooks.com/api/v2/summary.json");
});

Deno.test("service: a major outage maps to down", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "major" }, components: [] } }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: an unreachable status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
