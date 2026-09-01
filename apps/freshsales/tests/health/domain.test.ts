import { assertEquals } from "@std/assert";
import { mockCtx, mockFreshsalesCtx } from "../_helpers.ts";
import check from "../../health/domain.ts";

Deno.test("domain: needs the Connection for a URL but no credential to read it", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "context");
  // `*.myfreshworks.com` is already on the app's allowlist.
  assertEquals(check.network, undefined);
});

Deno.test("domain: 200 and 401 both pass — the account is serving either way", async () => {
  const ok = mockFreshsalesCtx([{ body: { filters: [] } }]);
  const okOut = await check.check!({}, ok.ctx);
  assertEquals(ok.calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/filters");
  assertEquals(okOut.state, "ok");

  const unauthorized = mockFreshsalesCtx([{ status: 401, body: {} }]);
  assertEquals((await check.check!({}, unauthorized.ctx)).state, "ok");
});

Deno.test("domain: a 404 is a missing domain, not a bad credential", async () => {
  const { ctx } = mockFreshsalesCtx([{ status: 404, body: {} }]);
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "domain not found — the account may have been renamed");
});

Deno.test("domain: a 5xx is down", async () => {
  const { ctx } = mockFreshsalesCtx([{ status: 502, body: {} }]);
  assertEquals((await check.check!({}, ctx)).state, "down");
});

Deno.test("domain: unknown, without a request, when the connection records no domain", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await check.check!({}, ctx), {
    state: "unknown",
    message: "connection records no domain",
  });
  assertEquals(calls.length, 0);
});
