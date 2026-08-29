import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import apiToken, { authHeaders } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-token: authHeaders() sends the raw key with no prefix", () => {
  assertEquals(authHeaders({ apiKey: "abc123" }), { authorization: "abc123" });
  assertEquals(authHeaders({}), { authorization: "" });
});

Deno.test("api-token: sign() stamps the unprefixed authorization header", async () => {
  const request = { url: "https://api.assemblyai.com/v2/transcript", method: "GET", headers: {} };
  const out = await apiToken.sign!(
    { request, credential: { apiKey: "abc123" } },
    {} as unknown as HookContext,
  );
  assertEquals(out.headers["authorization"], "abc123");
  assertEquals(Object.keys(out.headers).includes("Bearer"), false);
});

Deno.test("api-token: declared as type apiKey with no Bearer prefix configured", () => {
  assertEquals(apiToken.type, "apiKey");
  assertEquals(apiToken.apiKey?.name, "authorization");
  assertEquals(apiToken.apiKey?.prefix, undefined);
});

Deno.test("api-token: test() probes GET /v2/transcript?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { page_details: {}, transcripts: [] } }]);
  const out = await apiToken.test({ credential: { apiKey: "good-key" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/v2/transcript");
  assertEquals(queryOf(calls[0].url).limit, "1");
  assertEquals(calls[0].headers["authorization"], "good-key");
});

Deno.test("api-token: test() reports missing apiKey without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiToken.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test() on 401 explains the three documented causes, not just 'bad key'", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Authentication error, API token missing/invalid"),
  }]);
  const out = await apiToken.test({ credential: { apiKey: "bad-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("account is disabled"), true);
  assertEquals(out.message?.includes("balance"), true);
});

Deno.test("api-token: test() surfaces a non-401 failure with the vendor's error message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("Internal Server Error") }]);
  const out = await apiToken.test({ credential: { apiKey: "some-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("500"), true);
  assertEquals(out.message?.includes("Internal Server Error"), true);
});

Deno.test("api-token: declares a single required secret field", () => {
  assertEquals(apiToken.fields?.length, 1);
  assertEquals(apiToken.fields?.[0].key, "apiKey");
  assertEquals(apiToken.fields?.[0].type, "secret");
  assertEquals(apiToken.fields?.[0].required, true);
});
