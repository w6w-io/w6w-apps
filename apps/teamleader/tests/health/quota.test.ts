import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota from "../../health/quota.ts";

Deno.test("quota: reports ok with plenty of headroom", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "u1" } },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "200",
      "x-ratelimit-remaining": "150",
      "x-ratelimit-reset": "2026-09-01T10:51:23.035+0100",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/users.me");
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.[0].limit, 200);
  assertEquals(out.quota?.[0].remaining, 150);
  assertEquals(out.quota?.[0].resetAt, "2026-09-01T10:51:23.035+0100");
});

Deno.test("quota: reports degraded once remaining is low", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: {} },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "200",
      "x-ratelimit-remaining": "10",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: reports degraded (not down — recoverable within a minute) once exhausted", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: {} },
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "200",
      "x-ratelimit-remaining": "0",
    },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("quota: reports unknown when the headers are absent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: {} } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: reports unknown, not degraded, when the credential itself is rejected", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: is signed and scoped per connection", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
