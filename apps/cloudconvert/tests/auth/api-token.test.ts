import { assertEquals } from "@std/assert";
import apiToken, { authHeaders } from "../../auth/api-token.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("api-token: authHeaders() builds the Bearer header", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Bearer abc" });
});

Deno.test("api-token: sign() stamps the Authorization header and returns the request", () => {
  const request = {
    url: "https://api.cloudconvert.com/v2/jobs",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = apiToken.sign!(
    { request, credential: { apiKey: "abc" } },
    mockCtx().ctx,
  ) as typeof request;
  assertEquals(out.headers["authorization"], "Bearer abc");
  assertEquals(out, request); // mutated and returned, not copied
});

Deno.test("api-token: test() fails fast on a missing credential, with no request made", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiToken.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test() probes GET /v2/jobs?per_page=1", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const out = await apiToken.test({ credential: { apiKey: "good" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/v2/jobs");
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(calls[0].headers["authorization"], "Bearer good");
});

Deno.test("api-token: test() reports a 401 UNAUTHENTICATED as a bad/revoked key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Unauthenticated.", "UNAUTHENTICATED"),
  }]);
  const out = await apiToken.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true);
});

Deno.test("api-token: test() names the scope gap on a 403", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden.", "FORBIDDEN") }]);
  const out = await apiToken.test({ credential: { apiKey: "scoped" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.toLowerCase().includes("task.read"), true);
});

Deno.test("api-token: test() falls back to a generic message for an unexpected status", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const out = await apiToken.test({ credential: { apiKey: "x" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("500"), true);
});

Deno.test("api-token: afterConnect() keeps only email/username", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { id: 1, email: "me@example.com", username: "me", credits: 500 } },
  }]);
  const out = await apiToken.afterConnect!({ credential: { apiKey: "x" } }, ctx);
  assertEquals(out, { email: "me@example.com", username: "me" });
});

Deno.test("api-token: afterConnect() is silent on failure — never fails a good Connection", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("Forbidden.", "FORBIDDEN") }]);
  const out = await apiToken.afterConnect!({ credential: { apiKey: "task-only-key" } }, ctx);
  assertEquals(out, {});
});

Deno.test("api-token: declares api-token as its key and bearer as its type", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "bearer");
});

Deno.test("api-token: the apiKey field is type secret", () => {
  const field = apiToken.fields?.find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
});
