import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  ACCEPT,
  API_VERSION,
  compact,
  formatVimeoError,
  idFromRef,
  nest,
  readRateLimit,
  toArray,
  toCsv,
  truncate,
  USER_AGENT,
  videoUri,
  VimeoClient,
} from "../../lib/client.ts";
import { collection, errorBody, jsonBody, mockCtx, q, url, video } from "../_helpers.ts";

Deno.test("client: the Accept header pins the documented API version", () => {
  assertEquals(API_VERSION, "3.4");
  assertEquals(ACCEPT, "application/vnd.vimeo.*+json;version=3.4");
});

Deno.test("client: every request carries the versioned Accept and a self-identifying UA", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([video(1)]) }]);
  await new VimeoClient(ctx).collection("/me/videos");
  assertEquals(calls[0].headers.accept, ACCEPT);
  assertEquals(calls[0].headers["user-agent"], USER_AGENT);
  assertEquals(url(calls[0]).origin, "https://api.vimeo.com");
});

Deno.test("client: no request carries an Authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { status: 204 }]);
  const client = new VimeoClient(ctx);
  await client.request("/me");
  await client.request("/me/likes/1", { method: "PUT" });
  for (const call of calls) {
    assertEquals(call.headers.authorization, undefined);
  }
});

Deno.test("client: content-type is set only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { body: {} }]);
  const client = new VimeoClient(ctx);
  await client.request("/me/likes/1", { method: "PUT" });
  await client.request("/me", { method: "PATCH", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(jsonBody(calls[1]), { name: "x" });
});

Deno.test("client: query values are set once, comma-joined, and blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([]) }]);
  await new VimeoClient(ctx).collection("/me/videos", {
    query: {
      fields: ["uri", "name"],
      page: 2,
      per_page: 100,
      include_subfolders: false,
      query: undefined,
      sort: "",
      direction: null,
    },
  });
  const u = url(calls[0]);
  // One comma-separated value, never a repeated key — the shape this API takes.
  assertEquals(u.searchParams.getAll("fields"), ["uri,name"]);
  assertEquals(q(calls[0], "page"), "2");
  assertEquals(q(calls[0], "per_page"), "100");
  // `false` is a meaningful value and must survive.
  assertEquals(q(calls[0], "include_subfolders"), "false");
  assertEquals(q(calls[0], "query"), null);
  assertEquals(q(calls[0], "sort"), null);
  assertEquals(q(calls[0], "direction"), null);
});

Deno.test("client: 204 and an empty body yield undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new VimeoClient(ctx);
  assertEquals(await client.request("/me/likes/1", { method: "PUT" }), undefined);
  assertEquals(await client.request("/me/likes/1", { method: "DELETE" }), undefined);
});

Deno.test("client: an error surfaces Vimeo's developer_message and error_code", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(8003, "The app didn't receive the user's credentials.") },
  ]);
  const err = await assertRejects(() => new VimeoClient(ctx).request("/me"), Error);
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("error_code 8003"), err.message);
  assert(err.message.includes("The app didn't receive the user's credentials."), err.message);
  assert(err.message.includes("/me"), err.message);
});

Deno.test("client: a non-JSON error body is still reported rather than swallowed", () => {
  const message = formatVimeoError(502, "GET", "/me", "<html>bad gateway</html>");
  assert(message.includes("502"));
  assert(message.includes("bad gateway"));
});

Deno.test("client: an error body with only the user-facing message still reports it", () => {
  const message = formatVimeoError(400, "PATCH", "/videos/1", JSON.stringify({ error: "Nope." }));
  assert(message.includes("Nope."), message);
});

Deno.test("client: truncate caps a long body and says by how much", () => {
  const out = truncate("x".repeat(1000), 100);
  assert(out.startsWith("x".repeat(100)));
  assert(out.includes("1000 bytes truncated"));
  assertEquals(truncate("short", 100), "short");
});

Deno.test("compact: drops unset keys but keeps false and zero", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

/**
 * The reference documents body fields in dot notation (`privacy.view`) but the
 * wire format is nested JSON. Sending the literal dotted key is a different
 * request that Vimeo will not apply, so this translation is load-bearing.
 */
Deno.test("nest: dotted keys become nested objects", () => {
  assertEquals(
    nest({
      name: "Clip",
      "privacy.view": "password",
      "privacy.embed": "whitelist",
      "upload.approach": "pull",
    }),
    {
      name: "Clip",
      privacy: { view: "password", embed: "whitelist" },
      upload: { approach: "pull" },
    },
  );
});

Deno.test("nest: an unset leaf never creates an empty parent object", () => {
  // A bare `"privacy": {}` is a body field the user did not ask for.
  assertEquals(nest({ name: "Clip", "privacy.view": undefined }), { name: "Clip" });
  assertEquals(nest({ "privacy.view": "", "privacy.embed": null }), {});
});

Deno.test("nest: false and zero are meaningful leaves and survive", () => {
  assertEquals(
    nest({ "privacy.download": false, "upload.size": 0 }),
    { privacy: { download: false }, upload: { size: 0 } },
  );
});

Deno.test("toCsv: normalises arrays, strings and blanks to one comma-separated value", () => {
  assertEquals(toCsv(["uri", "name"]), "uri,name");
  assertEquals(toCsv("uri, name "), "uri,name");
  assertEquals(toCsv("single"), "single");
  assertEquals(toCsv(""), undefined);
  assertEquals(toCsv(undefined), undefined);
  assertEquals(toCsv(null), undefined);
  assertEquals(toCsv(" , , "), undefined);
});

/**
 * `[]` and `undefined` are different requests: `embed_domains: []` clears the
 * allowlist, so a param the user left blank must never become one.
 */
Deno.test("toArray: blank input is undefined, never an empty array", () => {
  assertEquals(toArray("a, b"), ["a", "b"]);
  assertEquals(toArray(["a"]), ["a"]);
  assertEquals(toArray(""), undefined);
  assertEquals(toArray(undefined), undefined);
  assertEquals(toArray(" , "), undefined);
});

Deno.test("idFromRef: accepts a bare id or any Vimeo URI form", () => {
  assertEquals(idFromRef("258684937", "Video ID"), "258684937");
  assertEquals(idFromRef(258684937, "Video ID"), "258684937");
  assertEquals(idFromRef("/videos/258684937", "Video ID"), "258684937");
  assertEquals(idFromRef("/videos/258684937/", "Video ID"), "258684937");
  // Folders are `projects` in the path; showcases are `albums` in the path but
  // `/showcases/` in their own URI. Both reduce to the trailing id.
  assertEquals(idFromRef("/users/152184/projects/12345", "Folder ID"), "12345");
  assertEquals(idFromRef("/showcases/3706071", "Showcase ID"), "3706071");
  assertEquals(idFromRef("/me/albums/3706071", "Showcase ID"), "3706071");
});

Deno.test("idFromRef: a blank reference is a clear error, not a request to /videos/", () => {
  assertThrows(() => idFromRef("", "Video ID"), Error, "Video ID is required");
  assertThrows(() => idFromRef("   ", "Video ID"), Error, "Video ID is required");
  assertThrows(() => idFromRef("/", "Video ID"), Error, "Video ID");
});

Deno.test("idFromRef: a path-breaking id is percent-encoded", () => {
  assertEquals(idFromRef("a b", "Video ID"), "a%20b");
});

Deno.test("videoUri: canonicalises an id or URI into the /videos/{id} form bulk endpoints want", () => {
  assertEquals(videoUri("258684937"), "/videos/258684937");
  assertEquals(videoUri("/videos/258684937"), "/videos/258684937");
  assertEquals(videoUri(273576296), "/videos/273576296");
});

/**
 * The three headers Vimeo documents. `X-RateLimit-Reset` is a datetime, not a
 * unix epoch, and is normalised to ISO 8601 for the health report.
 */
Deno.test("readRateLimit: reads all three documented headers", () => {
  const reading = readRateLimit(
    new Headers({
      "x-ratelimit-limit": "5000",
      "x-ratelimit-remaining": "4993",
      "x-ratelimit-reset": "2026-08-11T04:00:00+00:00",
    }),
  );
  assertEquals(reading.limit, 5000);
  assertEquals(reading.remaining, 4993);
  assertEquals(reading.resetAt, "2026-08-11T04:00:00.000Z");
});

/**
 * Measured: a live unauthenticated request to api.vimeo.com returns none of the
 * three. An empty reading must stay empty so the check reports `unknown` rather
 * than inventing a number.
 */
Deno.test("readRateLimit: no headers yields an empty reading, not zeroes", () => {
  assertEquals(readRateLimit(new Headers()), {});
  assertEquals(readRateLimit(new Headers({ "content-type": "application/json" })), {});
});

Deno.test("readRateLimit: unparseable values are dropped rather than reported as NaN", () => {
  const reading = readRateLimit(
    new Headers({ "x-ratelimit-limit": "lots", "x-ratelimit-reset": "soon" }),
  );
  assertEquals(reading, {});
});

Deno.test("readRateLimit: a partial reading is kept", () => {
  const reading = readRateLimit(new Headers({ "x-ratelimit-remaining": "0" }));
  assertEquals(reading.remaining, 0);
  assertEquals(reading.limit, undefined);
});
