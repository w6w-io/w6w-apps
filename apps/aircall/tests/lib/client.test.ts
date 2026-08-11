import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  AircallClient,
  API_BASE,
  compact,
  encodeId,
  flag,
  formatAircallError,
  stripWebhookToken,
  stripWebhookTokens,
  toIdList,
  toList,
  truncate,
  V1,
  V2,
} from "../../lib/client.ts";
import { entityBody, listBody, mockCtx, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("client: one origin, version in the path", () => {
  assertEquals(API_BASE, "https://api.aircall.io");
  assertEquals(V1, "/v1");
  assertEquals(V2, "/v2");
});

Deno.test("client: entity() unwraps the resource envelope", async () => {
  const { ctx } = mockCtx([{ body: entityBody("call", { id: 812 }) }]);
  const out = await new AircallClient(ctx).entity<{ id: number }>("/calls/812", "call");
  assertEquals(out?.id, 812);
});

/** A response that is not enveloped must come back whole rather than as undefined. */
Deno.test("client: entity() passes an unenveloped body through", async () => {
  const { ctx } = mockCtx([{ body: { id: 812 } }]);
  const out = await new AircallClient(ctx).entity<{ id: number }>("/calls/812", "call");
  assertEquals(out?.id, 812);
});

Deno.test("client: list() splits meta from the named collection", async () => {
  const { ctx } = mockCtx([{ body: listBody("calls", [{ id: 1 }, { id: 2 }], { total: 9 }) }]);
  const { meta, items } = await new AircallClient(ctx).list("/calls", "calls");
  assertEquals(items.length, 2);
  assertEquals(meta.total, 9);
});

Deno.test("client: list() of an absent collection is empty, not a crash", async () => {
  const { ctx } = mockCtx([{ body: { meta: {} } }]);
  const { items } = await new AircallClient(ctx).list("/calls", "calls");
  assertEquals(items, []);
});

/** Several endpoints answer 204 with no body; that is success, not a parse error. */
Deno.test("client: a 204 yields undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new AircallClient(ctx).json("/calls/812/transfers", { method: "POST" });
  assertEquals(out, undefined);
});

Deno.test("client: a JSON body sets the content type Aircall requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await new AircallClient(ctx).status("/tags", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "x" }));
});

Deno.test("client: a request with no body sets no content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await new AircallClient(ctx).status("/calls/1/pause_recording", { method: "POST" });
  assertEquals(calls[0].headers["content-type"], undefined);
});

Deno.test("client: the prefix selects the v1 or v2 surface", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new AircallClient(ctx);
  await client.json("/users");
  await client.json("/users", { prefix: V2 });
  assertEquals(pathOf(calls[0].url), "/v1/users");
  assertEquals(pathOf(calls[1].url), "/v2/users");
});

/**
 * Aircall's only array query param is `tags[]` on Search Calls, and it is a
 * repeated key. Comma-joining it matches nothing and looks like an empty result.
 */
Deno.test("client: array query values become repeated key[] parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new AircallClient(ctx).json("/calls/search", { query: { tags: [545, 678] } });
  assertEquals(queryAll(calls[0].url, "tags[]"), ["545", "678"]);
});

Deno.test("client: empty, null and undefined query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new AircallClient(ctx).json("/calls", {
    query: { a: undefined, b: null, c: "", d: 0, e: false },
  });
  // 0 and false survive; the three empties do not.
  assertEquals(queryOf(calls[0].url), { d: "0", e: "false" });
});

/**
 * `@` must survive path escaping or `GET /v2/users/john.doe@aircall.io` — an
 * addressing form Aircall documents verbatim — turns into `%40`.
 * `encodeURIComponent` alone escapes it, which is the trap.
 */
Deno.test("client: encodeId keeps @ . and - but neutralises path separators", () => {
  assertEquals(encodeId("john.doe@aircall.io"), "john.doe@aircall.io");
  assertEquals(
    encodeId("c2501111-8a69-4342-bb34-bcd6cfe564ab"),
    "c2501111-8a69-4342-bb34-bcd6cfe564ab",
  );
  assertEquals(encodeId("812"), "812");
  assertEquals(encodeId(812), "812");
  assertEquals(encodeId("a/b"), "a%2Fb");
  assertEquals(encodeId("a?b=c"), "a%3Fb%3Dc");
  assertEquals(encodeId("  812  "), "812");
});

Deno.test("client: compact drops empties but keeps false and zero", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

Deno.test("client: flag renders only a true as a query value", () => {
  assertEquals(flag(true), "true");
  assertEquals(flag(false), undefined);
  assertEquals(flag(undefined), undefined);
});

Deno.test("client: toList and toIdList normalise arrays and comma strings", () => {
  assertEquals(toList(["a", " b "]), ["a", "b"]);
  assertEquals(toList("a, b"), ["a", "b"]);
  assertEquals(toList([]), undefined);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);

  assertEquals(toIdList(["545", "678"]), [545, 678]);
  assertEquals(toIdList("545,678"), [545, 678]);
  assertEquals(toIdList(["545", "nope"]), [545]);
  assertEquals(toIdList(["nope"]), undefined);
});

Deno.test("client: truncate says how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const long = truncate("x".repeat(50), 10);
  assert(long.startsWith("xxxxxxxxxx"), long);
  assert(long.includes("50 bytes truncated"), long);
});

// --- error formatting -------------------------------------------------------

/**
 * The documented body is `{error, troubleshoot}`; the body actually observed for
 * 401/403/404 is `{message}`, because those are refused at the AWS edge before
 * Aircall's application runs. A formatter that knows only one renders the other
 * as an empty string.
 */
Deno.test("client: both error-body shapes are surfaced", () => {
  const documented = formatAircallError(
    400,
    "POST",
    "/v1/calls/812/comments",
    JSON.stringify({ error: "Bad Request", troubleshoot: "Maximum of 5 notes" }),
  );
  assert(documented.includes("Bad Request"), documented);
  assert(documented.includes("Maximum of 5 notes"), documented);

  const edge = formatAircallError(403, "GET", "/v1/ping", JSON.stringify({ message: "Forbidden" }));
  assert(edge.includes("Forbidden"), edge);
});

Deno.test("client: a non-JSON body still reaches the message", () => {
  const out = formatAircallError(502, "GET", "/v1/calls", "<html>bad gateway</html>");
  assert(out.includes("bad gateway"), out);
});

Deno.test("client: 401 and 403 are explained the way Aircall means them", () => {
  const unauthorized = formatAircallError(401, "GET", "/v1/ping", "");
  assert(unauthorized.includes("no Authorization header"), unauthorized);

  const forbidden = formatAircallError(403, "GET", "/v1/ping", "");
  assert(forbidden.includes("INVALID api_id/api_token"), forbidden);
  assert(
    forbidden.includes("not for a missing permission"),
    `403 must not be read as a scope problem: ${forbidden}`,
  );
});

Deno.test("client: 405 is explained as a state error, and 429 quotes the ceiling", () => {
  const state = formatAircallError(405, "POST", "/v1/users/456/calls", "");
  assert(state.includes("state error"), state);

  const limited = formatAircallError(429, "GET", "/v1/calls", "");
  assert(limited.includes("120 requests/minute per company"), limited);
});

Deno.test("client: a failed request throws with the method and path", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not Found" } }]);
  const err = await assertRejects(
    () => new AircallClient(ctx).json("/calls/999"),
    Error,
  );
  assert(err.message.includes("GET /v1/calls/999"), err.message);
});

// --- webhook secret stripping ----------------------------------------------

Deno.test("client: stripWebhookToken removes only the token", () => {
  const stripped = stripWebhookToken({
    webhook_id: "uuid-1",
    url: "https://a.example.com",
    active: true,
    events: ["call.created"],
    token: "abc123",
  }) as Record<string, unknown>;

  assertEquals(stripped.token, undefined);
  assertEquals(stripped.webhook_id, "uuid-1");
  assertEquals(stripped.active, true);
  assertEquals(stripped.events, ["call.created"]);
});

Deno.test("client: stripWebhookToken copies rather than mutating its input", () => {
  const original = { webhook_id: "uuid-1", token: "abc123" };
  stripWebhookToken(original);
  assertEquals(original.token, "abc123", "the caller's object must be untouched");
});

Deno.test("client: stripWebhookTokens covers a whole page", () => {
  const rows = stripWebhookTokens([
    { webhook_id: "a", token: "s1" },
    { webhook_id: "b", token: "s2" },
  ]);
  const serialized = JSON.stringify(rows);
  assert(!serialized.includes("s1"), serialized);
  assert(!serialized.includes("s2"), serialized);
});

/**
 * The stripper is deliberately narrow. A heuristic that ate any field called
 * `token` would corrupt a Contact's `information` payload or a Call's tags —
 * user data this app exists to move.
 */
Deno.test("client: stripping a non-webhook shape leaves user data intact", () => {
  const contact = stripWebhookToken({
    id: 710,
    information: "token: keep-me",
    phone_numbers: [{ label: "Work", value: "+1900" }],
  }) as Record<string, unknown>;
  assertEquals(contact.information, "token: keep-me");
  assertEquals((contact.phone_numbers as unknown[]).length, 1);
});

Deno.test("client: stripping a non-object is a no-op", () => {
  assertEquals(stripWebhookToken(undefined), undefined);
  assertEquals(stripWebhookToken(null), null);
  assertEquals(stripWebhookToken("a string"), "a string");
});
