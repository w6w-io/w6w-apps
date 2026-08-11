import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asOptionalJson,
  compact,
  formatMattermostError,
  MattermostClient,
  normalizeSiteUrl,
  siteUrlFromConnection,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockMattermostCtx, postList } from "../_helpers.ts";

Deno.test("normalizeSiteUrl: reduces every plausible paste to one origin", () => {
  const expected = "https://mattermost.example.com";
  assertEquals(normalizeSiteUrl("https://mattermost.example.com"), expected);
  assertEquals(normalizeSiteUrl("https://mattermost.example.com/"), expected);
  assertEquals(normalizeSiteUrl("  https://mattermost.example.com/api/v4  "), expected);
  assertEquals(
    normalizeSiteUrl("https://mattermost.example.com/acme/channels/town-square"),
    expected,
  );
});

/**
 * A token in flight deserves TLS, but the vendor's own example is
 * `http://localhost:8065` — an explicit http:// must survive.
 */
Deno.test("normalizeSiteUrl: bare hostnames become https, explicit http is honoured", () => {
  assertEquals(normalizeSiteUrl("mattermost.example.com"), "https://mattermost.example.com");
  assertEquals(normalizeSiteUrl("http://localhost:8065"), "http://localhost:8065");
});

Deno.test("normalizeSiteUrl: rejects empty and unparseable input", () => {
  assertThrows(() => normalizeSiteUrl(""), Error, "empty");
  assertThrows(() => normalizeSiteUrl("https://"), Error);
});

Deno.test("siteUrlFromConnection: reads display, and says so when it is missing", () => {
  const { ctx } = mockMattermostCtx();
  assertEquals(siteUrlFromConnection(ctx.connection), "https://mattermost.example.com");
  assertThrows(() => siteUrlFromConnection(undefined), Error, "records no server URL");
});

Deno.test("compact: drops unset keys but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("toList: accepts an array, a bare string, or a comma-separated string", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(","), undefined);
});

Deno.test("asOptionalJson: passes objects through, parses strings, names bad JSON", () => {
  assertEquals(asOptionalJson({ a: 1 }, "Props"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "Props"), { a: 1 });
  assertEquals(asOptionalJson("", "Props"), undefined);
  assertThrows(() => asOptionalJson("{nope", "Props"), Error, "Props is not valid JSON");
});

Deno.test("truncate: leaves short text alone and reports what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

/**
 * The `id` is the stable half of a Mattermost error and the part that tells an
 * operator which problem they have. It must survive.
 */
Deno.test("formatMattermostError: surfaces the error id, message and request id", () => {
  const msg = formatMattermostError(
    401,
    "GET",
    "/api/v4/users/me",
    JSON.stringify(
      errorBody("api.context.session_expired.app_error", "Invalid or expired session"),
    ),
  );
  assert(msg.includes("401"), msg);
  assert(msg.includes("api.context.session_expired.app_error"), msg);
  assert(msg.includes("Invalid or expired session"), msg);
  assert(msg.includes("w45fxn5zuibtix469g9pdd8a8h"), msg);
});

Deno.test("formatMattermostError: falls back to the raw body when it is not Mattermost's shape", () => {
  const msg = formatMattermostError(502, "GET", "/api/v4/posts", "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("bad gateway"), msg);
});

Deno.test("client: builds against the connection's server URL", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: postList([]) }]);
  await new MattermostClient(ctx).request("/api/v4/posts");
  assertEquals(calls[0].url, "https://mattermost.example.com/api/v4/posts");
});

Deno.test("client: drops empty query values instead of sending blanks", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: {} }]);
  await new MattermostClient(ctx).request("/api/v4/posts", {
    query: { a: undefined, b: null, c: "", d: 0, e: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("b"), null);
  assertEquals(url.searchParams.get("c"), null);
  assertEquals(url.searchParams.get("d"), "0");
  assertEquals(url.searchParams.get("e"), "false");
});

Deno.test("client: a 204 resolves to undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockMattermostCtx([{ status: 204 }]);
  assertEquals(
    await new MattermostClient(ctx).request("/api/v4/posts/p1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("client: a JSON body is sent with a content-type, a GET is not", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: {} }, { body: {} }]);
  const client = new MattermostClient(ctx);
  await client.request("/api/v4/posts", { method: "POST", body: { message: "hi" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"message":"hi"}');
  await client.request("/api/v4/posts");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: a non-2xx throws with Mattermost's own error id", async () => {
  const { ctx } = mockMattermostCtx([
    { status: 403, body: errorBody("api.context.permissions.app_error", "No permission", 403) },
  ]);
  await assertRejects(
    async () => {
      await new MattermostClient(ctx).request("/api/v4/posts");
    },
    Error,
    "api.context.permissions.app_error",
  );
});

/** The action worker must never see or build an Authorization header. */
Deno.test("client: never sets an authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockMattermostCtx([{ body: {} }]);
  await new MattermostClient(ctx).request("/api/v4/posts");
  assertEquals(calls[0].headers["authorization"], undefined);
});
