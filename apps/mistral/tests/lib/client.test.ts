import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { MistralClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new MistralClient(ctx);
  const result = await client.request("/v1/files/f1");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new MistralClient(ctx);
  const err = await assertRejects(
    () => client.request("/v1/models/missing"),
    Error,
    "Mistral 404",
  );
  assertEquals(err.message.includes("/v1/models/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new MistralClient(ctx);
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
  const client = new MistralClient(ctx);
  await client.request("/v1/chat/completions", {
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
  const client = new MistralClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: non-JSON responses returned as text", async () => {
  const { ctx } = mockCtx([
    { body: "line1\nline2", headers: { "content-type": "application/x-ndjson" } },
  ]);
  const client = new MistralClient(ctx);
  const result = await client.request("/v1/files/xyz/content");
  assertEquals(result, "line1\nline2");
});
