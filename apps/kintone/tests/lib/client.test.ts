import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  apiRoot,
  compact,
  KintoneClient,
  normalizeBaseUrl,
  parseJson,
  safeErrorMessage,
} from "../../lib/client.ts";

Deno.test("normalizeBaseUrl: adds https, strips trailing slash", () => {
  assertEquals(normalizeBaseUrl("acme.cybozu.com"), "https://acme.cybozu.com");
  assertEquals(normalizeBaseUrl("https://acme.cybozu.com/"), "https://acme.cybozu.com");
});

Deno.test("normalizeBaseUrl: strips a pasted /k/v1/... suffix back to the tenant root", () => {
  assertEquals(
    normalizeBaseUrl("https://acme.cybozu.com/k/v1/record.json?app=1"),
    "https://acme.cybozu.com",
  );
  assertEquals(normalizeBaseUrl("https://acme.kintone.com/k"), "https://acme.kintone.com");
});

Deno.test("normalizeBaseUrl: rejects empty and invalid input", () => {
  assertThrows(() => normalizeBaseUrl(""), Error, "empty");
  assertThrows(() => normalizeBaseUrl("http://"), Error);
});

Deno.test("apiRoot: appends /k/guest/{id} only when a Guest Space ID is set", () => {
  assertEquals(apiRoot({ baseUrl: "https://acme.cybozu.com" }), "https://acme.cybozu.com/k");
  assertEquals(
    apiRoot({ baseUrl: "https://acme.cybozu.com", guestSpaceId: "5" }),
    "https://acme.cybozu.com/k/guest/5",
  );
});

Deno.test("apiRoot: throws when the connection records no tenant URL", () => {
  assertThrows(() => apiRoot({}), Error, "no tenant URL");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: 0, f: false }), {
    a: 1,
    e: 0,
    f: false,
  });
});

Deno.test("parseJson: passes through a live value, parses a JSON string, rejects garbage", () => {
  assertEquals(parseJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(parseJson('{"a":1}', "x"), { a: 1 });
  assertEquals(parseJson(undefined, "x"), undefined);
  assertEquals(parseJson("", "x"), undefined);
  assertThrows(() => parseJson("{not json", "record"), Error, "record");
});

Deno.test("safeErrorMessage: prefixes the vendor code when present", () => {
  assertEquals(
    safeErrorMessage({ code: "CB_IJ01", message: "Invalid JSON string." }),
    "CB_IJ01: Invalid JSON string.",
  );
  assertEquals(safeErrorMessage({ message: "no code here" }), "no code here");
  assertEquals(safeErrorMessage(null), undefined);
  assertEquals(safeErrorMessage({}), undefined);
});

Deno.test("KintoneClient: builds {root}/v1/{path}.json and appends query params", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { record: { $id: { value: "1" } } } }],
    { display: { baseUrl: "https://acme.cybozu.com" } },
  );
  const client = new KintoneClient(ctx);
  await client.request("/record", { query: { app: "1", id: "1" } });
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/v1/record.json?app=1&id=1");
});

Deno.test("KintoneClient: routes through the Guest Space path when configured", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: {} }],
    { display: { baseUrl: "https://acme.cybozu.com", guestSpaceId: "9" } },
  );
  await new KintoneClient(ctx).request("/app", { query: { id: "1" } });
  assertEquals(calls[0].url, "https://acme.cybozu.com/k/guest/9/v1/app.json?id=1");
});

Deno.test("KintoneClient: array query params expand as fields[0]=...&fields[1]=...", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { records: [], totalCount: null } }],
    { display: { baseUrl: "https://acme.cybozu.com" } },
  );
  await new KintoneClient(ctx).request("/records", {
    query: { app: "1", fields: ["$id", "Created_by"] },
  });
  assertEquals(
    calls[0].url,
    "https://acme.cybozu.com/k/v1/records.json?app=1&fields%5B0%5D=%24id&fields%5B1%5D=Created_by",
  );
});

Deno.test("KintoneClient: a non-ok response surfaces Kintone's {code, message} shape", async () => {
  const { ctx } = mockCtx(
    [{ status: 400, body: { code: "GAIA_IL19", id: "abc", message: "Illegal request." } }],
    { display: { baseUrl: "https://acme.cybozu.com" } },
  );
  const err = await assertRejects(
    async () => await new KintoneClient(ctx).request("/record", { query: { app: "1", id: "1" } }),
    Error,
  );
  assert(err.message.includes("GAIA_IL19"), err.message);
  assert(err.message.includes("Illegal request."), err.message);
});

Deno.test("KintoneClient: a non-JSON error body (Cybozu's edge HTML) is excerpted, not thrown raw", async () => {
  const { ctx } = mockCtx(
    [{
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: "<html><body><h2>このリンクは不正です。</h2></body></html>",
    }],
    { display: { baseUrl: "https://nope.cybozu.com" } },
  );
  const err = await assertRejects(
    async () => await new KintoneClient(ctx).request("/record", { query: { app: "1", id: "1" } }),
    Error,
  );
  assert(err.message.includes("404"), err.message);
});
