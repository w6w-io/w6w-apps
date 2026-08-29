import { assertEquals } from "@std/assert";
import domain from "../../health/domain.ts";
import { mockCtx, mockGorgiasCtx } from "../_helpers.ts";

Deno.test("domain: is an unsigned, connection-scoped dependency check", () => {
  assertEquals(domain.kind, "dependency");
  assertEquals(domain.scope, "connection");
  assertEquals(domain.credential, "context");
  assertEquals(domain.network, undefined);
});

Deno.test("domain: unknown when the connection records no domain", async () => {
  const { ctx } = mockCtx();
  const r = await domain.check!({}, ctx);
  assertEquals(r.state, "unknown");
});

Deno.test("domain: a 401 passes — it proves the account is serving", async () => {
  const { ctx, calls } = mockGorgiasCtx([{
    status: 401,
    body: { error: { msg: "Unauthorized." } },
  }]);
  const r = await domain.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/account");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("domain: 200 also passes", async () => {
  const { ctx } = mockGorgiasCtx([{ status: 200, body: { domain: "acme" } }]);
  assertEquals((await domain.check!({}, ctx)).state, "ok");
});

Deno.test("domain: 404 is down — the account may have been renamed or removed", async () => {
  const { ctx } = mockGorgiasCtx([{ status: 404, body: "Not Found" }]);
  const r = await domain.check!({}, ctx);
  assertEquals(r.state, "down");
});

Deno.test("domain: a 5xx is down", async () => {
  const { ctx } = mockGorgiasCtx([{ status: 502, body: "" }]);
  assertEquals((await domain.check!({}, ctx)).state, "down");
});
