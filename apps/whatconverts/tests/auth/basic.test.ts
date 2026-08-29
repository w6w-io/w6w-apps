import { assertEquals } from "@std/assert";
import basic, { authHeaders } from "../../auth/basic.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

function fakeRequest() {
  return { url: `${API_ROOT}/leads`, method: "GET", headers: {} as Record<string, string> };
}

Deno.test("authHeaders builds a Basic header from token:secret", () => {
  const headers = authHeaders({ token: "tok", secret: "sec" });
  assertEquals(headers, { authorization: `Basic ${btoa("tok:sec")}` });
});

Deno.test("sign stamps the Authorization header and returns the request unchanged otherwise", () => {
  const request = fakeRequest();
  const result = basic.sign!({ request, credential: { token: "tok", secret: "sec" } } as never, {
    fetch: () => {
      throw new Error("sign must not call fetch");
    },
    log: () => {},
  } as never);
  assertEquals((result as typeof request).headers.authorization, `Basic ${btoa("tok:sec")}`);
  assertEquals((result as typeof request).url, `${API_ROOT}/leads`);
});

Deno.test("test() fails fast when the credential is incomplete", async () => {
  const { ctx } = mockCtx([]);
  const result = await basic.test({ credential: { token: "" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "credential missing token or secret");
});

Deno.test("test() succeeds on a 200 from the leads probe", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leads: [] } }]);
  const result = await basic.test({ credential: { token: "tok", secret: "sec" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, `${API_ROOT}/leads?leads_per_page=1`);
  assertEquals(calls[0].headers.authorization, `Basic ${btoa("tok:sec")}`);
});

Deno.test('test() reports "not provided" distinctly from "failed"', async () => {
  const { ctx: ctxMissing } = mockCtx([
    { status: 401, body: { error_message: "Authentication not provided." } },
  ]);
  const missing = await basic.test({ credential: { token: "tok", secret: "sec" } }, ctxMissing);
  assertEquals(missing.ok, false);
  assertEquals(missing.message?.includes("did not reach the request"), true);

  const { ctx: ctxWrong } = mockCtx([
    { status: 401, body: { error_message: "Authentication failed." } },
  ]);
  const wrong = await basic.test({ credential: { token: "tok", secret: "sec" } }, ctxWrong);
  assertEquals(wrong.ok, false);
  assertEquals(wrong.message?.includes("rejected the API token/secret"), true);
});

Deno.test("test() treats a non-JSON error body as unverifiable, not a bad credential", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: "<html>Oops! That page couldn't be found.</html>",
    headers: { "content-type": "text/html; charset=UTF-8" },
  }]);
  const result = await basic.test({ credential: { token: "tok", secret: "sec" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("cannot confirm the credential"), true);
});

Deno.test("test() reports an unexpected status generically", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error_message: "Internal error." } }]);
  const result = await basic.test({ credential: { token: "tok", secret: "sec" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "WhatConverts returned HTTP 500: Internal error. for /leads");
});
