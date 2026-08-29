import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { envelope, invalidKeyErrorBody, mockCtx, noAuthErrorBody, pathOf } from "../_helpers.ts";

Deno.test("sign: stamps X-API-KEY, never Authorization", () => {
  const request = { headers: {} as Record<string, string>, url: "https://api.connecteam.com/me" };
  const out = apiKey.sign!(
    { request, credential: { apiKey: "secret-key-123" } } as never,
    {} as never,
  ) as typeof request;
  assertEquals(out.headers["x-api-key"], "secret-key-123");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("sign: an empty credential stamps an empty header rather than throwing", () => {
  const request = { headers: {} as Record<string, string> };
  const out = apiKey.sign!({ request, credential: {} } as never, {} as never) as typeof request;
  assertEquals(out.headers["x-api-key"], "");
});

Deno.test("test: a missing apiKey field fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: a live key probes GET /me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ companyName: "Acme", companyId: "co_1" }) }]);
  const result = await apiKey.test({ credential: { apiKey: "good-key" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/me");
  assertEquals(calls[0].headers["x-api-key"], "good-key");
});

Deno.test("test: 'no authentication provided' is reported distinctly from a bad key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: noAuthErrorBody("/me") }]);
  const result = await apiKey.test({ credential: { apiKey: "whatever" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("did not reach the request"), result.message);
});

Deno.test("test: an invalid/revoked key (403) is reported distinctly", async () => {
  const { ctx } = mockCtx([{ status: 403, body: invalidKeyErrorBody() }]);
  const result = await apiKey.test({ credential: { apiKey: "wrong-key" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Invalid API key"), result.message);
});

Deno.test("test: an unrecognised failure falls back to the generic formatter", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: "oops",
    headers: { "content-type": "text/plain" },
  }]);
  const result = await apiKey.test({ credential: { apiKey: "x" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"), result.message);
});

Deno.test("afterConnect: publishes companyName/companyId and nothing else", async () => {
  const { ctx } = mockCtx([{ body: envelope({ companyName: "Acme", companyId: "co_1" }) }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "good-key" } }, ctx);
  assertEquals(out, { companyName: "Acme", companyId: "co_1" });
});

Deno.test("afterConnect: a failed lookup returns {} rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 403, body: invalidKeyErrorBody() }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(out, {});
});

Deno.test("the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});

Deno.test("the apiKey config points at the X-API-KEY header, no prefix", () => {
  assertEquals(apiKey.apiKey, { in: "header", name: "X-API-KEY" });
  assertEquals(apiKey.type, "apiKey");
});
