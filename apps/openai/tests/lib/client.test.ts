import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { base64ToBytes, OpenAIClient } from "../../lib/client.ts";

Deno.test("client: JSON body sets content-type and stringifies", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new OpenAIClient(ctx);
  await client.request("/chat/completions", { method: "POST", body: { model: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ model: "x" }));
});

Deno.test("client: FormData body is passed through without content-type override", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new OpenAIClient(ctx);
  const form = new FormData();
  form.append("purpose", "assistants");
  await client.request("/files", { method: "POST", form });
  assertEquals(calls[0].method, "POST");
  // No manual content-type — fetch adds `multipart/form-data; boundary=…`.
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].rawBody instanceof FormData, true);
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new OpenAIClient(ctx);
  const result = await client.request("/files/file-1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 400, statusText: "Bad Request", body: '{"error":"invalid"}' },
  ]);
  const client = new OpenAIClient(ctx);
  const err = await assertRejects(
    () => client.request("/chat/completions", { method: "POST", body: {} }),
    Error,
    "OpenAI 400",
  );
  assertEquals(err.message.includes("/v1/chat/completions"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new OpenAIClient(ctx);
  await client.request("/files", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("base64ToBytes: decodes plain base64", () => {
  const buf = base64ToBytes("aGVsbG8=");
  assertEquals(new TextDecoder().decode(new Uint8Array(buf)), "hello");
});

Deno.test("base64ToBytes: strips a data URL prefix", () => {
  const buf = base64ToBytes("data:image/png;base64,aGVsbG8=");
  assertEquals(new TextDecoder().decode(new Uint8Array(buf)), "hello");
});
