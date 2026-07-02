import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { AsanaClient } from "../../lib/client.ts";

Deno.test("client: 204 returns { data: undefined } without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new AsanaClient(ctx);
  const result = await client.request("/tasks/1");
  assertEquals(result, { data: undefined });
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"errors":[{"message":"Not Found"}]}' },
  ]);
  const client = new AsanaClient(ctx);
  const err = await assertRejects(
    () => client.request("/tasks/missing"),
    Error,
    "Asana 404",
  );
  assertEquals(err.message.includes("/api/1.0/tasks/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new AsanaClient(ctx);
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
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  const client = new AsanaClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: wraps POST body under { data: ... }", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { gid: "1" } } }]);
  const client = new AsanaClient(ctx);
  await client.request("/tasks", { method: "POST", body: { name: "hello" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ data: { name: "hello" } }));
});

Deno.test("client: DELETE does not send a body even when one is provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  const client = new AsanaClient(ctx);
  await client.request("/tasks/1", { method: "DELETE", body: { foo: "bar" } });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("client: returns the parsed envelope on success", async () => {
  const envelope = { data: [{ gid: "1" }], next_page: { offset: "abc" } };
  const { ctx } = mockCtx([{ body: envelope }]);
  const client = new AsanaClient(ctx);
  const out = await client.request("/tasks");
  assertEquals(out, envelope);
});
