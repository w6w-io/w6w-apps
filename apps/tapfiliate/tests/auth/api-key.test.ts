import { assert, assertEquals } from "@std/assert";
import apiKeyAuth, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: authHeaders builds x-api-key with no prefix", () => {
  assertEquals(authHeaders({ apiKey: "secret-123" }), { "x-api-key": "secret-123" });
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("api-key: sign stamps x-api-key onto the outbound request", () => {
  const request = {
    url: "https://api.tapfiliate.com/1.6/programs/",
    headers: {} as Record<string, string>,
  };
  const out = apiKeyAuth.sign!(
    { request, credential: { apiKey: "secret-123" } } as never,
    {} as never,
  );
  assertEquals((out as typeof request).headers["x-api-key"], "secret-123");
});

Deno.test("api-key: test() rejects an empty credential without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKeyAuth.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("missing apiKey"));
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test() passes on a 200 from the probe path", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "johns-affiliate-program" }] }]);
  const result = await apiKeyAuth.test({ credential: { apiKey: "real-key" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), `/1.6${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-api-key"], "real-key");
});

Deno.test("api-key: test() classifies a JSON 401 body, not just the status code", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Authentication Failed.", 401) }]);
  const result = await apiKeyAuth.test({ credential: { apiKey: "wrong-key" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Authentication Failed."));
  assert(result.message?.includes("Settings > API"));
});

Deno.test("api-key: test() recognises the HTML login-wall page as a distinct, non-JSON failure", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      headers: { "content-type": "text/html; charset=UTF-8" },
      body: "<html>Unauthorized</html>",
    },
  ]);
  const result = await apiKeyAuth.test({ credential: { apiKey: "some-key" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("non-JSON response"));
  assert(!result.message?.includes("Authentication Failed"));
});

Deno.test("api-key: test() reports a non-401 status generically without inventing a reason", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("Internal error", 500) }]);
  const result = await apiKeyAuth.test({ credential: { apiKey: "some-key" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
});

Deno.test("api-key: declares a secret field and both required hooks", () => {
  assertEquals(apiKeyAuth.type, "apiKey");
  assertEquals(apiKeyAuth.apiKey, { in: "header", name: "X-Api-Key" });
  assertEquals(apiKeyAuth.fields?.length, 1);
  assertEquals(apiKeyAuth.fields?.[0].type, "secret");
  assertEquals(typeof apiKeyAuth.test, "function");
  assertEquals(typeof apiKeyAuth.sign, "function");
});
