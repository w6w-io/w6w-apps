import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = {
  page: { name: "Capsule" },
  status: { indicator: "none", description: "All Systems Operational" },
  components: [
    { name: "Capsule", status: "operational" },
    { name: "Drop Box", status: "operational" },
  ],
};

Deno.test("service: is an unsigned, app-scoped, unauthenticated check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.covers, ["*"]);
  assertEquals(service.network?.allow, ["status.capsulecrm.com"]);
});

Deno.test("service: all-operational summary is ok, reporting the Capsule component", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.capsulecrm.com/api/v2/summary.json");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals(r.state, "ok");
  assertEquals(r.components?.capsule?.state, "ok");
});

Deno.test("service: an outage on the Capsule component reports down, ignoring Drop Box", async () => {
  const { ctx } = mockCtx([{
    body: {
      ...SUMMARY,
      status: { indicator: "major", description: "Partial Outage" },
      components: [
        { name: "Capsule", status: "major_outage" },
        { name: "Drop Box", status: "operational" },
      ],
    },
  }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "down");
  assertEquals(r.components?.capsule?.state, "down");
});

Deno.test("service: a Drop Box-only outage does not affect the reported state", async () => {
  const { ctx } = mockCtx([{
    body: {
      ...SUMMARY,
      components: [
        { name: "Capsule", status: "operational" },
        { name: "Drop Box", status: "major_outage" },
      ],
    },
  }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
});

Deno.test("service: minor indicator maps to degraded when no Capsule component is found", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "minor" }, components: [] } }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: a failed status API is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
