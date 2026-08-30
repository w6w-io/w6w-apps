import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: authHeaders() sends the raw key with no prefix", () => {
  assertEquals(authHeaders({ apiKey: "abc123" }), { authorization: "abc123" });
  assertEquals(authHeaders({}), { authorization: "" });
});

Deno.test("api-key: sign() stamps the unprefixed authorization header", async () => {
  const request = { url: "https://api.quo.com/v1/phone-numbers", method: "GET", headers: {} };
  const out = await apiKey.sign!(
    { request, credential: { apiKey: "abc123" } },
    {} as unknown as HookContext,
  );
  assertEquals(out.headers["authorization"], "abc123");
  assertEquals(Object.keys(out.headers).includes("Bearer"), false);
});

Deno.test("api-key: declared as type apiKey with no Bearer prefix configured", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey?.name, "authorization");
  assertEquals(apiKey.apiKey?.prefix, undefined);
});

Deno.test("api-key: test() probes GET /v1/phone-numbers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await apiKey.test({ credential: { apiKey: "good-key" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), `/v1${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "good-key");
});

Deno.test("api-key: test() reports missing apiKey without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test() surfaces a 401 using the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const out = await apiKey.test({ credential: { apiKey: "bad-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true);
  assertEquals(out.message?.includes("Unauthorized"), true);
});

Deno.test("api-key: test() surfaces a non-401 failure with the vendor's error message", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: errorBody("Internal Server Error", "ServerError"),
  }]);
  const out = await apiKey.test({ credential: { apiKey: "some-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("500"), true);
  assertEquals(out.message?.includes("Internal Server Error"), true);
});

Deno.test("api-key: declares a single required secret field", () => {
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].key, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});
