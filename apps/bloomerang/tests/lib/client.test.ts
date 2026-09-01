import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, BloomerangClient, compact, pageQuery } from "../../lib/client.ts";

Deno.test("API_URL points at the real v2 host", () => {
  assertEquals(API_URL, "https://api.bloomerang.co/v2");
});

Deno.test("BloomerangClient: GET builds the url, sets accept, and drops empty query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { ok: true } }]);
  await new BloomerangClient(ctx).request("/funds", {
    query: { search: "General", isActive: undefined, take: 0 },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/funds");
  assertEquals(url.searchParams.get("search"), "General");
  assertEquals(url.searchParams.has("isActive"), false);
  // take=0 is falsy but not undefined/null/"" — it must survive.
  assertEquals(url.searchParams.get("take"), "0");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("BloomerangClient: POST sets content-type and serializes the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 1 } }]);
  await new BloomerangClient(ctx).request("/note", {
    method: "POST",
    body: { AccountId: 1, Note: "hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { AccountId: 1, Note: "hi" });
});

Deno.test("BloomerangClient: never sets an Authorization or X-API-KEY header itself", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new BloomerangClient(ctx).request("/funds");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("BloomerangClient: throws with Bloomerang's own Message + ErrorCode on failure", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { Message: "Invalid Credentials", ErrorCode: 109 },
  }]);
  await assertRejects(
    () => new BloomerangClient(ctx).request("/user/current"),
    Error,
    "Invalid Credentials (code 109)",
  );
});

Deno.test("BloomerangClient: falls back to raw text when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  await assertRejects(() => new BloomerangClient(ctx).request("/funds"), Error, "oops");
});

Deno.test("BloomerangClient: a 204 response resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new BloomerangClient(ctx).request("/note/1");
  assertEquals(result, undefined);
});

Deno.test("pageQuery: maps skip/take straight through", () => {
  assertEquals(pageQuery({ skip: 10, take: 25 }), { skip: 10, take: 25 });
});

Deno.test("compact: drops only undefined values, keeps null and falsy values", () => {
  const out = compact({ a: undefined, b: null, c: 0, d: "", e: false, f: "x" });
  assertEquals(out, { b: null, c: 0, d: "", e: false, f: "x" });
  assert(!("a" in out));
});
