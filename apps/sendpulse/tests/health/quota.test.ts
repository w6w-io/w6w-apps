import { assert, assertEquals } from "@std/assert";
import quota, { DETAIL_URL } from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: hits GET /user/balance/detail", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: { emails_left: 100 } } }]);
  await quota.check!({}, ctx);
  assertEquals(calls[0].url, DETAIL_URL);
});

Deno.test("quota: ok with headroom on both dimensions", async () => {
  const { ctx } = mockCtx([{
    body: { email: { emails_left: 500, maximum_subscribers: 1000, current_subscribers: 100 } },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota?.length, 2);
});

Deno.test("quota: a zero subscriber ceiling (pay-as-you-go) is unmetered, not exhausted", async () => {
  const { ctx } = mockCtx([{
    body: { email: { emails_left: 500, maximum_subscribers: 0, current_subscribers: 0 } },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  // Only the emails-left dimension is reported — the subscriber ceiling
  // dimension is skipped entirely rather than reported as 100% consumed.
  assertEquals(out.quota?.map((q) => q.id), ["emails-left"]);
});

Deno.test("quota: degraded at or above 90% of the subscriber ceiling", async () => {
  const { ctx } = mockCtx([{
    body: { email: { emails_left: 10, maximum_subscribers: 100, current_subscribers: 95 } },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert(out.message?.includes("subscribers"));
});

Deno.test("quota: down at 100% of the subscriber ceiling", async () => {
  const { ctx } = mockCtx([{
    body: { email: { emails_left: 10, maximum_subscribers: 100, current_subscribers: 100 } },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("quota: down when the pay-as-you-go balance hits exactly zero", async () => {
  const { ctx } = mockCtx([{ body: { email: { emails_left: 0 } } }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message?.includes("no pay-as-you-go email credit"));
});

Deno.test("quota: unknown on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: unknown when the response carries no email block", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("quota: is a signed, connection-scoped check", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
