import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/site.ts";

function withDisplay(display: Record<string, unknown>) {
  const mock = mockCtx([]);
  (mock.ctx as { connection?: unknown }).connection = { display };
  return mock;
}

Deno.test("site: is an unsigned, connection-scoped dependency check", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "context");
  // *.atlassian.net / api.atlassian.com are already on the app's allowlist.
  assertEquals(check.network, undefined);
});

Deno.test("site: unknown when the connection records no site (OAuth before its first token)", async () => {
  const { ctx } = withDisplay({});
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("site: ok when /info answers and JSM is licensed", async () => {
  const { ctx, calls } = mockCtx([{ body: { isLicensedForUse: true, version: "5.0.0" } }]);
  (ctx as { connection?: unknown }).connection = { display: { site: "acme" } };
  const out = await check.check!({}, ctx);
  assertEquals(calls[0].url, "https://acme.atlassian.net/rest/servicedeskapi/info");
  assertEquals(out.state, "ok");
  assertEquals(out.message, "JSM 5.0.0");
});

Deno.test("site: down when the site answers but isLicensedForUse is false — measured live on a real Jira Cloud site", async () => {
  const { ctx } = mockCtx([{ body: { isLicensedForUse: false } }]);
  (ctx as { connection?: unknown }).connection = { display: { site: "support" } };
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.message, "site is serving but Jira Service Management is not licensed on it");
});

Deno.test("site: down on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 404 }]);
  (ctx as { connection?: unknown }).connection = { display: { site: "gone" } };
  const out = await check.check!({}, ctx);
  assertEquals(out.state, "down");
});
