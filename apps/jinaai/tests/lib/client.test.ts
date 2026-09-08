import { assertEquals, assertRejects } from "@std/assert";
import { JinaApiError, JinaClient, parseJinaError } from "../../lib/client.ts";
import { errorBody, mockCtx, nestedErrorBody, pathOf, queryOf } from "../_helpers.ts";

Deno.test("parseJinaError: flat envelope (detail is a string)", () => {
  const info = parseJinaError(401, errorBody("Invalid API key.", "AUTH_INVALID_API_KEY"));
  assertEquals(info.status, 401);
  assertEquals(info.message, "Invalid API key.");
  assertEquals(info.code, "AUTH_INVALID_API_KEY");
  assertEquals(info.requestId, "req-0001");
});

Deno.test("parseJinaError: nested envelope (detail is an object)", () => {
  const info = parseJinaError(404, nestedErrorBody("Model 'x' not found", "RESOURCE_NOT_FOUND"));
  assertEquals(info.status, 404);
  assertEquals(info.message, "Model 'x' not found");
  assertEquals(info.code, "RESOURCE_NOT_FOUND");
});

Deno.test("parseJinaError: unreadable body falls back to a generic message", () => {
  const info = parseJinaError(500, null);
  assertEquals(info.status, 500);
  assertEquals(info.message, "Jina AI returned HTTP 500");
  assertEquals(info.code, undefined);
});

Deno.test("JinaClient: GET builds the full URL with query params, dropping empty ones", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new JinaClient(ctx);
  await client.request("/v1/batches", { query: { limit: 1, cursor: undefined, empty: "" } });

  assertEquals(pathOf(calls[0].url), "/v1/batches");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].method, "GET");
});

Deno.test("JinaClient: POST sends a JSON body and content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { model: "m", usage: {}, data: [] } }]);
  const client = new JinaClient(ctx);
  await client.request("/v1/embeddings", { method: "POST", body: { model: "m", input: ["hi"] } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { model: "m", input: ["hi"] });
});

Deno.test("JinaClient: never sets an authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new JinaClient(ctx);
  await client.request("/v1/models");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("JinaClient: asText reads the response as raw text, not JSON", async () => {
  const { ctx } = mockCtx([{
    body: '{"a":1}\n{"b":2}',
    headers: { "content-type": "text/plain" },
  }]);
  const client = new JinaClient(ctx);
  const out = await client.request<string>("/v1/batch/b1/output", { asText: true });
  assertEquals(out, '{"a":1}\n{"b":2}');
});

Deno.test("JinaClient: a non-ok response throws JinaApiError carrying the vendor's code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Invalid API key.", "AUTH_INVALID_API_KEY"),
  }]);
  const client = new JinaClient(ctx);

  const err = await assertRejects(
    () => client.request("/v1/embeddings", { method: "POST", body: {} }),
    JinaApiError,
  );
  assertEquals((err as JinaApiError).status, 401);
  assertEquals((err as JinaApiError).code, "AUTH_INVALID_API_KEY");
});

Deno.test("JinaClient: a 204 returns undefined without trying to parse a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const client = new JinaClient(ctx);
  const out = await client.request("/v1/classifiers/c1", { method: "DELETE" });
  assertEquals(out, undefined);
});
