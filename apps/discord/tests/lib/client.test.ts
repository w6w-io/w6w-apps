import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { DiscordClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new DiscordClient(ctx);
  const result = await client.request("/channels/x", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"message":"Unknown Message","code":10008}' },
  ]);
  const client = new DiscordClient(ctx);
  const err = await assertRejects(
    () => client.request("/channels/c/messages/missing"),
    Error,
    "Discord 404",
  );
  // Message should carry the path so failure logs are actionable.
  assertEquals(err.message.includes("/api/v10/channels/c/messages/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new DiscordClient(ctx);
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
  const client = new DiscordClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: POST with body serializes JSON and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const client = new DiscordClient(ctx);
  await client.request("/channels/c/messages", {
    method: "POST",
    body: { content: "hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ content: "hi" }));
});

Deno.test("client: empty body with 2xx returns undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const client = new DiscordClient(ctx);
  const result = await client.request("/anything");
  assertEquals(result, undefined);
});
