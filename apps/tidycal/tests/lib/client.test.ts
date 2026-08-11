import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_URL,
  asOptionalJson,
  compact,
  encodeId,
  flag,
  formatTidyCalError,
  TidyCalClient,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The document's server is the protocol-relative `//tidycal.com/api`, which
 * `new URL()` cannot parse and a generator would emit as `http://`. Plain HTTP
 * really does answer a 302, so the scheme is pinned once, here.
 */
Deno.test("client: the base URL is absolute https on the marketing host", () => {
  assertEquals(API_URL, "https://tidycal.com/api");
  assertEquals(new URL(API_URL).protocol, "https:");
  assertEquals(new URL(API_URL).hostname, "tidycal.com");
});

Deno.test("client: builds URL, method, accept and JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new TidyCalClient(ctx).json("/teams/4/users", {
    method: "POST",
    body: { email: "a@example.com" },
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/teams/4/users");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"email":"a@example.com"}');
});

Deno.test("client: a GET carries no content-type and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TidyCalClient(ctx).json("/me");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].body, null);
});

/** Blank query values are dropped so an empty form field never reaches Laravel. */
Deno.test("client: blank query values are dropped, zero and false survive", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new TidyCalClient(ctx).json("/bookings", {
    query: { page: 0, cancelled: false, email: "", host_id: undefined, x: null },
  });
  assertEquals(queryOf(calls[0].url), { page: "0", cancelled: "false" });
});

/**
 * Nothing is unwrapped. TidyCal wraps collections and creates in `data` but
 * answers the bare entity for `/me`, `/bookings/{id}`, `/teams/{id}` and the
 * cancel — a client that unwrapped unconditionally would return `undefined` for
 * the whoami, which is exactly the endpoint the health probe reads.
 */
Deno.test("client: returns the body verbatim for both envelope shapes", async () => {
  const { ctx } = mockCtx([
    { body: { data: [{ id: 1 }] } },
    { body: { name: "John Doe", email: "john@example.com" } },
  ]);
  const client = new TidyCalClient(ctx);

  assertEquals(await client.json("/bookings"), { data: [{ id: 1 }] });
  assertEquals(await client.json("/me"), { name: "John Doe", email: "john@example.com" });
});

Deno.test("client: a 204 and an empty body become undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new TidyCalClient(ctx);
  assertEquals(await client.json("/teams/4/users/9", { method: "DELETE" }), undefined);
  assertEquals(await client.json("/me"), undefined);
});

Deno.test("client: a non-2xx throws with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Team not found") }]);
  const err = await assertRejects(() => new TidyCalClient(ctx).json("/teams/9"), Error);
  assert(err.message.includes("404"), err.message);
  assert(err.message.includes("GET /api/teams/9"), err.message);
  assert(err.message.includes("Team not found"), err.message);
});

// --- error formatting -------------------------------------------------------

Deno.test("formatTidyCalError: flattens the 422 per-field map", () => {
  const msg = formatTidyCalError(
    422,
    "POST",
    "/api/booking-types",
    JSON.stringify(errorBody("The given data was invalid.", {
      url_slug: ["The url slug has already been taken."],
      duration_minutes: ["The duration minutes must be at least 1."],
    })),
  );
  assert(msg.includes("url_slug: The url slug has already been taken."), msg);
  assert(msg.includes("duration_minutes: The duration minutes must be at least 1."), msg);
});

/**
 * The 401 hint exists because TidyCal returns a byte-identical body for a
 * missing and a rejected credential (measured), so the message has to name both
 * possibilities rather than assert one.
 */
Deno.test("formatTidyCalError: a 401 says the two causes are indistinguishable", () => {
  const msg = formatTidyCalError(
    401,
    "GET",
    "/api/me",
    JSON.stringify(errorBody("Unauthenticated.")),
  );
  assert(msg.includes("Unauthenticated."), msg);
  assert(msg.includes("missing and a rejected token"), msg);
});

Deno.test("formatTidyCalError: a non-JSON body is reported rather than swallowed", () => {
  const msg = formatTidyCalError(502, "GET", "/api/me", "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

Deno.test("formatTidyCalError: an OAuth-style error body is understood too", () => {
  const msg = formatTidyCalError(
    400,
    "POST",
    "/oauth/token",
    JSON.stringify({ error: "invalid_request", error_description: "Check the client_id" }),
  );
  assert(msg.includes("Check the client_id"), msg);
});

Deno.test("truncate: long bodies are cut and the cut is announced", () => {
  const out = truncate("x".repeat(1000), 100);
  assertEquals(out.length < 200, true);
  assert(out.includes("truncated"), out);
  assertEquals(truncate("short", 100), "short");
});

// --- helpers ----------------------------------------------------------------

/**
 * `false` must survive: TidyCal documents three states for `cancelled` on the
 * team booking list, and dropping `false` would make one unreachable.
 */
Deno.test("flag: renders three states, not two", () => {
  assertEquals(flag(true), "true");
  assertEquals(flag(false), "false");
  assertEquals(flag(undefined), undefined);
  assertEquals(flag(null), undefined);
});

Deno.test("encodeId: neutralises separators pasted into an id field", () => {
  assertEquals(encodeId(7), "7");
  assertEquals(encodeId(" 7 "), "7");
  assertEquals(encodeId("7/../me"), "7%2F..%2Fme");
  assertEquals(encodeId("7?x=1"), "7%3Fx%3D1");
});

Deno.test("asOptionalJson: accepts parsed values and typed strings, rejects garbage", () => {
  assertEquals(asOptionalJson('[{"a":1}]', "Field"), [{ a: 1 }]);
  assertEquals(asOptionalJson([{ a: 1 }], "Field"), [{ a: 1 }]);
  assertEquals(asOptionalJson("", "Field"), undefined);
  assertEquals(asOptionalJson(undefined, "Field"), undefined);
  assertThrows(() => asOptionalJson("{oops", "Field"), Error, "Field is not valid JSON");
});

Deno.test("compact: drops blanks, keeps 0 and false", () => {
  assertEquals(
    compact({ a: 1, b: 0, c: false, d: "", e: undefined, f: null, g: "x" }),
    { a: 1, b: 0, c: false, g: "x" },
  );
});
