import { assert, assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("quota: reads X-Rate-Limit-* headers off the shared credential probe", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ count: "0" }),
    headers: {
      "content-type": "application/json",
      "x-rate-limit-limit": "180",
      "x-rate-limit-remaining": "179",
      "x-rate-limit-reset": "23",
    },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(pathOf(calls[0].url), "/1/Contacts/getInfo");
  assertEquals(report.state, "ok");
  assertEquals(report.quota?.[0].limit, 180);
  assertEquals(report.quota?.[0].remaining, 179);
  assert(typeof report.quota?.[0].resetAt === "string");
});

Deno.test("quota: reports degraded, not down, at the ceiling — the window recovers on its own", async () => {
  const { ctx } = mockCtx([{
    body: envelope({}),
    headers: {
      "x-rate-limit-limit": "180",
      "x-rate-limit-remaining": "0",
      "x-rate-limit-reset": "5",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "degraded");
});

Deno.test("quota: missing headers report unknown, not zero headroom", async () => {
  const { ctx } = mockCtx([{
    body: envelope({}),
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: non-numeric headers report unknown rather than NaN math", async () => {
  const { ctx } = mockCtx([{
    body: envelope({}),
    headers: { "x-rate-limit-limit": "not-a-number", "x-rate-limit-remaining": "179" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("quota: is signed and connection-scoped", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.kind, "quota");
});
