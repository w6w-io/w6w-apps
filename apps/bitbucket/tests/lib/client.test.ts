import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { BitbucketClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new BitbucketClient(ctx);
  const result = await client.request("/repositories/acme/foo/hooks/abc", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":{"message":"Not found"}}' },
  ]);
  const client = new BitbucketClient(ctx);
  const err = await assertRejects(
    () => client.request("/repositories/acme/missing"),
    Error,
    "Bitbucket 404",
  );
  // Path should be embedded for actionable failure logs.
  assertEquals(err.message.includes("/2.0/repositories/acme/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new BitbucketClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: passes an absolute URL through unchanged (Bitbucket paginates via full `next` URLs)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new BitbucketClient(ctx);
  await client.request("https://api.bitbucket.org/2.0/repositories/acme?page=2");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.bitbucket.org");
  assertEquals(url.pathname, "/2.0/repositories/acme");
  assertEquals(url.searchParams.get("page"), "2");
});

Deno.test("client: JSON-encodes bodies and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { uuid: "{abc}" } }]);
  const client = new BitbucketClient(ctx);
  await client.request("/workspaces/acme/hooks", {
    method: "POST",
    body: { url: "https://example/cb", events: ["repo:push"] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(
    JSON.parse(calls[0].body!),
    { url: "https://example/cb", events: ["repo:push"] },
  );
});
