import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("service: calls status.goto.com/api/v2/summary.json — the verified redirect target", async () => {
  const { ctx, calls } = mockCtx([
    { body: { status: { indicator: "none" }, components: [] } },
  ]);
  await service.check!({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/summary.json");
  assertEquals(new URL(calls[0].url).host, "status.goto.com");
});

Deno.test("service: reports ok when the named GoTo Webinar API component is operational", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "major", description: "Major outage" }, // unrelated product
        components: [
          { name: "GoTo Webinar API", status: "operational" },
          { name: "Rescue", status: "major_outage" },
        ],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["goto-webinar-api"].state, "ok");
});

Deno.test("service: reports the named component's own degraded/down state", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "none" },
        components: [{ name: "GoTo Webinar API", status: "major_outage" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
});

Deno.test("service: falls back to the page-wide rollup when the component is not found", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: { indicator: "minor" },
        components: [{ name: "Something Else", status: "operational" }],
      },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("not found in status feed"), true);
});

Deno.test("service: an unreachable status API reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.credential ?? "none", "none");
  assertEquals(service.network?.allow, ["status.goto.com"]);
});
