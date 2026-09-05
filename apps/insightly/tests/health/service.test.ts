import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = {
  page: { name: "Insightly" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { name: "Insightly Web App", status: "operational" },
    { name: "Insightly API", status: "operational" },
  ],
};

Deno.test("service: is an unsigned, app-scoped, unauthenticated check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.network?.allow, ["status.insightly.com"]);
});

Deno.test("service: all-operational summary is ok, with per-component detail", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.insightly.com/api/v2/summary.json");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.["insightly-api"]?.state, "ok");
  assertEquals(r.components?.["insightly-web-app"]?.state, "ok");
});

Deno.test("service: an API-only outage reports the API component down", async () => {
  const { ctx } = mockCtx([{
    body: {
      ...SUMMARY,
      status: { indicator: "major", description: "Partial API Outage" },
      components: [
        { name: "Insightly Web App", status: "operational" },
        { name: "Insightly API", status: "major_outage" },
      ],
    },
  }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.components?.["insightly-api"]?.state, "down");
  assertEquals(r.components?.["insightly-web-app"]?.state, "ok");
});

Deno.test("service: minor indicator maps to degraded", async () => {
  const { ctx } = mockCtx([{
    body: { ...SUMMARY, status: { indicator: "minor" } },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a failed status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
