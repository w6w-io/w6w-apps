import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { base64ToBytes, bytesToBase64, GroqClient } from "../../lib/client.ts";

Deno.test("client: uses the /openai/v1 prefix, not OpenAI's bare /v1", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new GroqClient(ctx);
  await client.request("/models");
  assertEquals(new URL(calls[0].url).pathname, "/openai/v1/models");
});

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new GroqClient(ctx);
  await client.request("/chat/completions", { method: "POST", body: { model: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ model: "x" }));
});

Deno.test("client: FormData body is passed through without content-type override", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new GroqClient(ctx);
  const form = new FormData();
  form.append("purpose", "batch");
  await client.request("/files", { method: "POST", form });
  assertEquals(calls[0].method, "POST");
  // No manual content-type — fetch adds `multipart/form-data; boundary=…`.
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].rawBody instanceof FormData, true);
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GroqClient(ctx);
  const result = await client.request("/files/file-1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: '{"error":"invalid"}' },
  ]);
  const client = new GroqClient(ctx);
  const err = await assertRejects(
    () => client.request("/chat/completions", { method: "POST", body: {} }),
    Error,
    "Groq 400",
  );
  assertEquals(err.message.includes("/openai/v1/chat/completions"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GroqClient(ctx);
  await client.request("/files", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: requestBinary base64-encodes a raw audio body and reports content-type", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: "hello",
    headers: { "content-type": "audio/wav" },
  }]);
  const client = new GroqClient(ctx);
  const result = await client.requestBinary("/audio/speech", {
    method: "POST",
    body: { model: "m", input: "hi", voice: "v" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(result.contentType, "audio/wav");
  assertEquals(
    new TextDecoder().decode(base64ToBytes(result.base64)),
    "hello",
  );
});

Deno.test("client: requestBinary throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: '{"error":"bad key"}' }]);
  const client = new GroqClient(ctx);
  await assertRejects(
    () => client.requestBinary("/audio/speech", { method: "POST", body: {} }),
    Error,
    "Groq 401",
  );
});

Deno.test("base64ToBytes: decodes plain base64", () => {
  const buf = base64ToBytes("aGVsbG8=");
  assertEquals(new TextDecoder().decode(new Uint8Array(buf)), "hello");
});

Deno.test("base64ToBytes: strips a data URL prefix", () => {
  const buf = base64ToBytes("data:image/png;base64,aGVsbG8=");
  assertEquals(new TextDecoder().decode(new Uint8Array(buf)), "hello");
});

Deno.test("bytesToBase64: round-trips through base64ToBytes", () => {
  const original = new TextEncoder().encode("round trip me");
  const b64 = bytesToBase64(original.buffer as ArrayBuffer);
  const back = new Uint8Array(base64ToBytes(b64));
  assertEquals(new TextDecoder().decode(back), "round trip me");
});

Deno.test("bytesToBase64: handles a payload larger than the chunk size", () => {
  const original = new Uint8Array(0x8000 + 10).fill(65); // 'A'
  const b64 = bytesToBase64(original.buffer);
  const back = new Uint8Array(base64ToBytes(b64));
  assertEquals(back.length, original.length);
  assertEquals(back[0], 65);
  assertEquals(back[back.length - 1], 65);
});
