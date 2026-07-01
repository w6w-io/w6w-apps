import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { resolveBaseUrl, WordPressClient } from "../../lib/client.ts";

Deno.test("resolveBaseUrl: self-hosted siteUrl → /wp-json/wp/v2", () => {
  assertEquals(resolveBaseUrl({ siteUrl: "https://example.com" }), "https://example.com/wp-json/wp/v2");
});

Deno.test("resolveBaseUrl: trims trailing slash from siteUrl", () => {
  assertEquals(resolveBaseUrl({ siteUrl: "https://example.com/" }), "https://example.com/wp-json/wp/v2");
});

Deno.test("resolveBaseUrl: WordPress.com hosted site → public-api sites URL", () => {
  assertEquals(
    resolveBaseUrl({ wordpressSite: "myblog.wordpress.com" }),
    "https://public-api.wordpress.com/wp/v2/sites/myblog.wordpress.com",
  );
});

Deno.test("resolveBaseUrl: WordPress.com site given as a URL → hostname only", () => {
  assertEquals(
    resolveBaseUrl({ wordpressSite: "https://myblog.wordpress.com/some/path" }),
    "https://public-api.wordpress.com/wp/v2/sites/myblog.wordpress.com",
  );
});

Deno.test("resolveBaseUrl: throws when neither field is provided", () => {
  assertThrows(() => resolveBaseUrl({}), Error, "missing siteUrl");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new WordPressClient(ctx, "https://example.com/wp-json/wp/v2");
  const result = await client.request("/posts/1");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"code":"rest_post_invalid_id"}' },
  ]);
  const client = new WordPressClient(ctx, "https://example.com/wp-json/wp/v2");
  const err = await assertRejects(
    () => client.request("/posts/999"),
    Error,
    "WordPress 404",
  );
  assert(err.message.includes("/wp-json/wp/v2/posts/999"));
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WordPressClient(ctx, "https://example.com/wp-json/wp/v2");
  await client.request("/posts", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: array query params join with commas", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new WordPressClient(ctx, "https://example.com/wp-json/wp/v2");
  await client.request("/posts", {
    query: { categories: [1, 2, 3], tags: [] },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("categories"), "1,2,3");
  // Empty arrays are omitted entirely.
  assertEquals(url.searchParams.has("tags"), false);
});

Deno.test("client: JSON bodies set content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const client = new WordPressClient(ctx, "https://example.com/wp-json/wp/v2");
  await client.request("/posts", { method: "POST", body: { title: "hi" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ title: "hi" }));
});

Deno.test("client: fromConnection reads display.siteUrl to build the base URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { siteUrl: "https://example.com" },
  });
  const client = WordPressClient.fromConnection(ctx);
  await client.request("/posts/1");
  assertEquals(new URL(calls[0].url).origin, "https://example.com");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/wp/v2/posts/1");
});

Deno.test("client: fromConnection reads display.wordpressSite for the OAuth path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    display: { wordpressSite: "myblog.wordpress.com" },
  });
  const client = WordPressClient.fromConnection(ctx);
  await client.request("/posts");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://public-api.wordpress.com");
  assertEquals(url.pathname, "/wp/v2/sites/myblog.wordpress.com/posts");
});
