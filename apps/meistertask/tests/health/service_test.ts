import { assertEquals } from "@std/assert";
import service, { mapSorryState } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("mapSorryState: the one confirmed-live value maps to ok", () => {
  assertEquals(mapSorryState("operational"), "ok");
});

Deno.test("mapSorryState: anything else is degraded, not down — vocabulary isn't documented", () => {
  assertEquals(mapSorryState("downtime"), "degraded");
  assertEquals(mapSorryState("maintenance"), "degraded");
});

Deno.test("mapSorryState: absence is unknown", () => {
  assertEquals(mapSorryState(undefined), "unknown");
});

Deno.test("service: reports ok when the page and the API component are both operational", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: {
        page: {
          id: 2543,
          name: "MeisterTask",
          state: "operational",
          url: "https://status.meistertask.com",
        },
      },
    },
    {
      status: 200,
      body: { components: [{ id: 1791, name: "API", state: "operational" }] },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("service: a degraded API component outranks a green page-level roll-up", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { page: { state: "operational", url: "https://status.meistertask.com" } },
    },
    {
      status: 200,
      body: { components: [{ id: 1791, name: "API", state: "downtime" }] },
    },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.message?.includes("API component"), true);
});

Deno.test("service: a broken status API reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: a page no longer self-identifying as MeisterTask's reports unknown", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { page: { state: "operational", url: "https://status.example.com" } } },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
