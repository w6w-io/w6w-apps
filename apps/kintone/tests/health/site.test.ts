import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

Deno.test("site: reports ok on a structured Kintone JSON error (tenant identified, request rejected)", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 400, body: { code: "CB_VA01", id: "x", message: "Illegal app id." } }],
    { display: { baseUrl: "https://acme.cybozu.com" } },
  );
  const out = await site.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/records.json?app=0");
});

Deno.test("site: reports ok directly on a 200", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { records: [], totalCount: null } }],
    { display: { baseUrl: "https://acme.cybozu.com" } },
  );
  const out = await site.check!({}, ctx);
  assertEquals(out.state, "ok");
});

Deno.test("site: reports down on Cybozu's non-JSON edge decoy page", async () => {
  const { ctx } = mockCtx(
    [{
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: "<html><body>このリンクは不正です。</body></html>",
    }],
    { display: { baseUrl: "https://nope.cybozu.com" } },
  );
  const out = await site.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("site: reports unknown when the connection records no tenant URL", async () => {
  const { ctx } = mockCtx([], { display: {} });
  const out = await site.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("site: is declared unsigned (credential: context)", () => {
  assertEquals(site.credential, "context");
  assertEquals(site.scope, "connection");
});
