import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { applySearchExtras, ContentfulClient, resolveScope } from "../../lib/client.ts";

Deno.test("client: defaults to CDN base", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  const client = new ContentfulClient(ctx);
  await client.request("/spaces/x/environments/master/entries");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://cdn.contentful.com");
  assertEquals(url.pathname, "/spaces/x/environments/master/entries");
});

Deno.test("client: routes to preview + management bases when requested", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new ContentfulClient(ctx);
  await client.request("/spaces/x/entries", { base: "preview" });
  await client.request("/spaces/x/entries", { base: "management" });
  assertEquals(new URL(calls[0].url).origin, "https://preview.contentful.com");
  assertEquals(new URL(calls[1].url).origin, "https://api.contentful.com");
});

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new ContentfulClient(ctx);
  const result = await client.request("/spaces/x/entries/e");
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"sys":{"id":"NotFound"}}' },
  ]);
  const client = new ContentfulClient(ctx);
  const err = await assertRejects(
    () => client.request("/spaces/x/entries/missing"),
    Error,
    "Contentful 404",
  );
  assertEquals(err.message.includes("/spaces/x/entries/missing"), true);
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new ContentfulClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: JSON-encodes body and defaults content-type to management vendor mime", async () => {
  const { ctx, calls } = mockCtx([{ body: { sys: { id: "e" } } }]);
  const client = new ContentfulClient(ctx);
  await client.request("/spaces/x/entries", {
    method: "POST",
    base: "management",
    body: { fields: { title: { "en-US": "Hi" } } },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/vnd.contentful.management.v1+json");
  assertEquals(calls[0].body, '{"fields":{"title":{"en-US":"Hi"}}}');
});

Deno.test("client: caller-supplied headers merge with defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new ContentfulClient(ctx);
  await client.request("/x", {
    method: "PUT",
    base: "management",
    body: { fields: {} },
    headers: { "X-Contentful-Version": "3", "content-type": "custom/type" },
  });
  assertEquals(calls[0].headers["x-contentful-version"], "3");
  // Caller override wins over the default vendor mime.
  assertEquals(calls[0].headers["content-type"], "custom/type");
});

Deno.test("resolveScope: prefers params over connection display", () => {
  const { ctx } = mockCtx([], {
    connection: {
      display: { space: { id: "conn-space" }, environment: { id: "staging" } },
    },
  });
  assertEquals(
    resolveScope({ spaceId: "p", environmentId: "e" }, ctx),
    { spaceId: "p", environmentId: "e" },
  );
});

Deno.test("resolveScope: falls back to connection display, defaults env to master", () => {
  const { ctx } = mockCtx([], {
    connection: { display: { space: { id: "conn-space" } } },
  });
  assertEquals(resolveScope({}, ctx), { spaceId: "conn-space", environmentId: "master" });
});

Deno.test("resolveScope: throws when no spaceId is available anywhere", () => {
  const { ctx } = mockCtx();
  assertThrows(() => resolveScope({}, ctx), Error, "missing `spaceId`");
});

Deno.test("applySearchExtras: unpacks `attribute=value` into proper query keys", () => {
  const qs: Record<string, string | number | boolean | undefined | null> = {};
  applySearchExtras(qs, {
    equal: "fields.title=hello",
    notEqual: "fields.title[ne]=nope",
    include: "fields.tags[in]=a,b",
    exclude: "fields.tags[nin]=c",
    exist: "fields.tags[exists]=true",
    select: "fields.title",
    order: "sys.createdAt",
    query: "hi",
    content_type: "post",
  });
  assertEquals(qs["fields.title"], "hello");
  assertEquals(qs["fields.title[ne]"], "nope");
  assertEquals(qs["fields.tags[in]"], "a,b");
  assertEquals(qs["fields.tags[nin]"], "c");
  assertEquals(qs["fields.tags[exists]"], "true");
  assertEquals(qs.select, "fields.title");
  assertEquals(qs.order, "sys.createdAt");
  assertEquals(qs.query, "hi");
  assertEquals(qs.content_type, "post");
});

Deno.test("applySearchExtras: ignores malformed strings without an `=`", () => {
  const qs: Record<string, string | number | boolean | undefined | null> = {};
  applySearchExtras(qs, { equal: "no-equals-sign", notEqual: undefined });
  assertEquals(Object.keys(qs).length, 0);
});
