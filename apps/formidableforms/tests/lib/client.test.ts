import { assertEquals, assertRejects } from "@std/assert";
import { BASE_PATH, DISPLAY, mockCtx } from "../_helpers.ts";
import {
  compactBody,
  compactQuery,
  FormidableClient,
  normalizeSiteUrl,
  resolveBaseUrl,
} from "../../lib/client.ts";

Deno.test("normalizeSiteUrl: strips a trailing slash", () => {
  assertEquals(normalizeSiteUrl("https://example.com/"), "https://example.com");
});

Deno.test("normalizeSiteUrl: strips a pasted /wp-json suffix", () => {
  assertEquals(normalizeSiteUrl("https://example.com/wp-json"), "https://example.com");
});

Deno.test("normalizeSiteUrl: strips a pasted full frm/v3 route", () => {
  assertEquals(normalizeSiteUrl("https://example.com/wp-json/frm/v3"), "https://example.com");
});

Deno.test("normalizeSiteUrl: preserves a subdirectory install's path", () => {
  assertEquals(normalizeSiteUrl("https://site.com/blog/"), "https://site.com/blog");
});

Deno.test("resolveBaseUrl: appends /wp-json/frm/v3", () => {
  assertEquals(
    resolveBaseUrl({ siteUrl: "https://example.com" }),
    "https://example.com/wp-json/frm/v3",
  );
});

Deno.test("resolveBaseUrl: throws when the connection records no site URL", () => {
  let threw = false;
  try {
    resolveBaseUrl({});
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});

Deno.test("compactQuery: drops undefined, null and empty-string values", () => {
  assertEquals(
    compactQuery({ a: "1", b: undefined, c: null, d: "", e: 0, f: false }),
    { a: "1", e: "0", f: "false" },
  );
});

Deno.test("compactBody: drops undefined, null and empty-string values", () => {
  assertEquals(
    compactBody({ a: "x", b: undefined, c: null, d: "" }),
    { a: "x" },
  );
});

Deno.test("FormidableClient.fromConnection: builds the base URL from connection.display", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }], { display: DISPLAY });
  const client = FormidableClient.fromConnection(ctx);
  await client.request("/forms");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms`);
});

Deno.test("FormidableClient.request: sends query params and skips empty ones", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  const client = FormidableClient.fromConnection(ctx);
  await client.request("/forms", { query: { search: "abc", page: undefined } });
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("search"), "abc");
  assertEquals(params.has("page"), false);
});

Deno.test("FormidableClient.request: sends a JSON body with content-type on write", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }], { display: DISPLAY });
  const client = FormidableClient.fromConnection(ctx);
  await client.request("/forms", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? "{}"), { name: "x" });
});

Deno.test("FormidableClient.request: never sets an authorization header itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  const client = FormidableClient.fromConnection(ctx);
  await client.request("/forms");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("FormidableClient.request: surfaces the WordPress error envelope's message", async () => {
  const { ctx } = mockCtx(
    [{ status: 403, body: { code: "rest_forbidden", message: "Sorry, no." } }],
    { display: DISPLAY },
  );
  const client = FormidableClient.fromConnection(ctx);
  await assertRejects(
    async () => await client.request("/forms"),
    Error,
    "Sorry, no.",
  );
});

Deno.test("FormidableClient.request: falls back to raw text when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }], { display: DISPLAY });
  const client = FormidableClient.fromConnection(ctx);
  await assertRejects(async () => await client.request("/forms"), Error, "oops");
});

Deno.test("FormidableClient.request: an empty successful body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }], { display: DISPLAY });
  const client = FormidableClient.fromConnection(ctx);
  const out = await client.request("/entries/1", { method: "DELETE" });
  assertEquals(out, undefined);
});
