import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BrevoClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new BrevoClient(ctx);
  const result = await client.request("/contacts/x");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"code":"document_not_found"}' },
  ]);
  const client = new BrevoClient(ctx);
  const err = await assertRejects(
    () => client.request("/contacts/missing"),
    Error,
    "Brevo 404",
  );
  assertEquals(err.message.includes("/v3/contacts/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new BrevoClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new BrevoClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: sends JSON body with content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const client = new BrevoClient(ctx);
  await client.request("/x", { method: "POST", body: { hello: "world" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ hello: "world" }));
});

Deno.test("client: does not set api-key header (auth sign hook injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new BrevoClient(ctx);
  await client.request("/account");
  assertEquals(calls[0].headers["api-key"], undefined);
});
