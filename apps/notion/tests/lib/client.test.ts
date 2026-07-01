import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { NotionClient, NOTION_VERSION } from "../../lib/client.ts";

Deno.test("client: pins Notion-Version on every request", async () => {
  const { ctx, calls } = mockCtx([{ body: { object: "database" } }]);
  const client = new NotionClient(ctx);
  await client.request("/databases/abc");
  assertEquals(calls[0].headers["notion-version"], NOTION_VERSION);
});

Deno.test("client: POST serialises body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  const client = new NotionClient(ctx);
  await client.request("/search", { method: "POST", body: { query: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ query: "x" }));
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: { code: "object_not_found" } }]);
  const client = new NotionClient(ctx);
  const err = await assertRejects(
    () => client.request("/databases/missing"),
    Error,
    "Notion 404",
  );
  assertEquals(err.message.includes("/v1/databases/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new NotionClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});
