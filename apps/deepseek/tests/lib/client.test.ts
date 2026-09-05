import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { DeepSeekClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new DeepSeekClient(ctx);
  const result = await client.request("/user/balance");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx, carrying the status", async () => {
  const { ctx } = mockCtx([
    { status: 402, statusText: "Payment Required", body: '{"error":"insufficient balance"}' },
  ]);
  const client = new DeepSeekClient(ctx);
  const err = await assertRejects(
    () => client.request("/chat/completions"),
    Error,
    "DeepSeek 402",
  );
  assertEquals(err.message.includes("/chat/completions"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new DeepSeekClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON body sets content-type and serializes", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new DeepSeekClient(ctx);
  await client.request("/chat/completions", {
    method: "POST",
    body: { model: "m", messages: [{ role: "user", content: "hi" }] },
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { model: "m", messages: [{ role: "user", content: "hi" }] },
  );
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new DeepSeekClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: non-JSON responses returned as text", async () => {
  const { ctx } = mockCtx([
    { body: "line1\nline2", headers: { "content-type": "text/plain" } },
  ]);
  const client = new DeepSeekClient(ctx);
  const result = await client.request("/models");
  assertEquals(result, "line1\nline2");
});

Deno.test("client: defaults to GET without a request body", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "list", data: [] } }]);
  const client = new DeepSeekClient(ctx);
  await client.request("/models");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});
