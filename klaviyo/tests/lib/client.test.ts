import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_REVISION, KlaviyoClient } from "../../lib/client.ts";

Deno.test("client: sends revision + accept headers on every request", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const client = new KlaviyoClient(ctx);
  await client.request("/profiles/");
  assertEquals(calls[0].headers["revision"], API_REVISION);
  assertEquals(calls[0].headers["accept"], "application/json");
  // No content-type on a plain GET.
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: adds content-type on writes and serializes JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const client = new KlaviyoClient(ctx);
  await client.request("/profiles/", { method: "POST", body: { hello: "world" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["revision"], API_REVISION);
  assertEquals(calls[0].body, '{"hello":"world"}');
});

Deno.test("client: 204 returns undefined without parsing", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new KlaviyoClient(ctx);
  const result = await client.request("/lists/xyz/", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws with a descriptive error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"errors":[{"detail":"gone"}]}' },
  ]);
  const client = new KlaviyoClient(ctx);
  const err = await assertRejects(
    () => client.request("/profiles/missing/"),
    Error,
    "Klaviyo 404",
  );
  assertEquals(err.message.includes("/api/profiles/missing/"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new KlaviyoClient(ctx);
  await client.request("/profiles/", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});
