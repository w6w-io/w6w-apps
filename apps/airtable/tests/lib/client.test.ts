import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { AirtableClient } from "../../lib/client.ts";

Deno.test("client: prefixes paths with the v0 base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  const client = new AirtableClient(ctx);
  await client.request("appABC/Users");
  assertEquals(new URL(calls[0].url).origin, "https://api.airtable.com");
  assertEquals(new URL(calls[0].url).pathname, "/v0/appABC/Users");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new AirtableClient(ctx);
  const result = await client.request("appABC/Users/rec1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new AirtableClient(ctx);
  const err = await assertRejects(
    () => client.request("appABC/Users/missing"),
    Error,
    "Airtable 404",
  );
  assertEquals(err.message.includes("/v0/appABC/Users/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new AirtableClient(ctx);
  await client.request("appABC/Users", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: encodes array query params as bracketed repeats", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new AirtableClient(ctx);
  await client.request("appABC/Users", { query: { fields: ["Name", "Email"] } });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("fields[]"), ["Name", "Email"]);
});

Deno.test("client: passes an absolute URL through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new AirtableClient(ctx);
  await client.request("https://example.internal/foo?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://example.internal");
  assertEquals(url.pathname, "/foo");
});

Deno.test("client: sends JSON body with correct content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1" } }]);
  const client = new AirtableClient(ctx);
  await client.request("appABC/Users", {
    method: "POST",
    body: { fields: { Name: "Jane" } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { fields: { Name: "Jane" } });
});
