import { assertEquals } from "@std/assert";
import bearerToken, { authHeaders } from "../../auth/bearer-token.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

Deno.test("authHeaders: builds the Bearer header", () => {
  assertEquals(authHeaders({ apiKey: "jina_abc" }), { authorization: "Bearer jina_abc" });
});

Deno.test("authHeaders: an empty credential still produces a well-formed header", () => {
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("sign: injects the Authorization header without touching anything else", async () => {
  const request = {
    url: "https://api.jina.ai/v1/embeddings",
    headers: {} as Record<string, string>,
  };
  const out = await bearerToken.sign!(
    { request, credential: { apiKey: "jina_abc" } } as never,
    {} as HookContext,
  );
  assertEquals(out.headers.authorization, "Bearer jina_abc");
  assertEquals(out.url, "https://api.jina.ai/v1/embeddings");
});

Deno.test("test: missing apiKey fails without making a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearerToken.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: probes GET /v1/batches?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const result = await bearerToken.test!({ credential: { apiKey: "jina_live" } } as never, ctx);

  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/v1/batches");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, "Bearer jina_live");
});

Deno.test("test: classifies a missing key from the vendor's own AUTH_MISSING_API_KEY code", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Authentication required.", "AUTH_MISSING_API_KEY") },
  ]);
  const result = await bearerToken.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: classifies an invalid key from the vendor's own AUTH_INVALID_API_KEY code", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("Invalid API key.", "AUTH_INVALID_API_KEY") },
  ]);
  const result = await bearerToken.test!({ credential: { apiKey: "jina_fake" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Invalid API key."), true);
});

Deno.test("test: an unrelated failure (e.g. 500) is surfaced, not misread as an auth failure", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { detail: { message: "boom", code: "INTERNAL_ERROR" } },
  }]);
  const result = await bearerToken.test!({ credential: { apiKey: "jina_live" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("500"), true);
});
