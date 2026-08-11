import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asJson,
  asJsonObject,
  asOptionalJson,
  classifyAuthFailure,
  compact,
  encodeSegment,
  flag,
  formatPodioError,
  PodioClient,
  REDACTED_FIELDS,
  stripSecrets,
  stripSecretsAll,
  THROTTLED_STATUS,
  toList,
  truncate,
} from "../../lib/client.ts";
import { BAD_TOKEN_401, mockCtx, NO_CREDENTIAL_401, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("flag: renders both booleans, absence stays absent", () => {
  // `hook=false` differs from Podio's documented default of true, so `false`
  // must survive rather than being collapsed into absence.
  assertEquals(flag(true), "true");
  assertEquals(flag(false), "false");
  assertEquals(flag(undefined), undefined);
});

Deno.test("asOptionalJson: accepts parsed values and typed strings alike", () => {
  assertEquals(asOptionalJson<number[]>("[1,2]", "x"), [1, 2]);
  assertEquals(asOptionalJson<number[]>([1, 2], "x"), [1, 2]);
  assertEquals(asOptionalJson("", "x"), undefined);
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertThrows(() => asOptionalJson("{not json", "Fields"), Error, "Fields is not valid JSON");
});

Deno.test("asJson: absence is an error", () => {
  assertThrows(() => asJson(undefined, "Fields"), Error, "Fields is required");
});

/**
 * The guard that matters most for this vendor. Podio ignores a `fields` value
 * it cannot read as a keyed map, so an array would produce a 200 that writes
 * nothing — a success that did nothing is the worst failure mode available.
 */
Deno.test("asJsonObject: rejects arrays and scalars, which Podio would silently ignore", () => {
  assertEquals(asJsonObject('{"title":"x"}', "Field values"), { title: "x" });
  assertThrows(
    () => asJsonObject("[1,2]", "Field values"),
    Error,
    "Field values must be a JSON object",
  );
  assertThrows(() => asJsonObject('"x"', "Field values"), Error, "must be a JSON object");
  // A literal `null` parses to a value Podio would ignore, so it is refused as
  // the wrong shape rather than as an absence — the user did supply something.
  assertThrows(() => asJsonObject("null", "Field values"), Error, "must be a JSON object");
  assertThrows(() => asJsonObject(undefined, "Field values"), Error, "Field values is required");
});

Deno.test("toList: splits, trims and drops empties", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(" , "), undefined);
});

Deno.test("truncate: reports how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const long = truncate("x".repeat(50), 10);
  assert(long.startsWith("xxxxxxxxxx…"));
  assert(long.includes("50 bytes truncated"));
});

Deno.test("encodeSegment: neutralises path-rewriting characters in an external id", () => {
  assertEquals(encodeSegment("abc"), "abc");
  assertEquals(encodeSegment(" 123 "), "123");
  assertEquals(encodeSegment("a/b"), "a%2Fb");
  assertEquals(encodeSegment("a?b=c"), "a%3Fb%3Dc");
  assertEquals(encodeSegment("../../admin"), "..%2F..%2Fadmin");
});

// --- the redaction that stops a read leaking a write credential -------------

Deno.test("REDACTED_FIELDS names exactly the app token and the push signature", () => {
  assertEquals([...REDACTED_FIELDS].sort(), ["push", "token"]);
});

Deno.test("stripSecrets: removes the app token and push channel, keeps everything else", () => {
  const app = {
    app_id: 1,
    token: "the-app-token-that-mints-access-tokens",
    push: { channel: "/app/1", signature: "abc", timestamp: 1 },
    config: { name: "Leads" },
    fields: [{ field_id: 2 }],
  };
  const out = stripSecrets(app) as Record<string, unknown>;
  assertEquals(out.token, undefined);
  assertEquals(out.push, undefined);
  assertEquals(out.app_id, 1);
  assertEquals(out.config, { name: "Leads" });
  assertEquals(out.fields, [{ field_id: 2 }]);
  // The original is untouched — the strip returns a copy.
  assertEquals(app.token, "the-app-token-that-mints-access-tokens");
});

/**
 * The narrowness is the point. A Podio app is a user-defined record type, so a
 * *field* legitimately named `token` is ordinary customer data. Only the
 * top-level key is a credential.
 */
Deno.test("stripSecrets: does not touch a user-defined field that happens to be named token", () => {
  const item = {
    item_id: 9,
    push: { signature: "s" },
    fields: [{ external_id: "token", values: [{ value: "customer's own value" }] }],
  };
  const out = stripSecrets(item) as Record<string, unknown>;
  assertEquals(out.push, undefined);
  assertEquals(out.fields, [{ external_id: "token", values: [{ value: "customer's own value" }] }]);
});

Deno.test("stripSecrets: passes non-objects through unchanged", () => {
  assertEquals(stripSecrets(null), null);
  assertEquals(stripSecrets("x"), "x");
  assertEquals(stripSecrets([1, 2]), [1, 2]);
});

Deno.test("stripSecretsAll: strips every element, tolerating a non-array", () => {
  assertEquals(
    stripSecretsAll<Record<string, unknown>>([
      { app_id: 1, token: "t" },
      { app_id: 2, token: "u" },
    ]),
    [{ app_id: 1 }, { app_id: 2 }],
  );
  assertEquals(stripSecretsAll(undefined as unknown as unknown[]), undefined);
});

// --- errors ------------------------------------------------------------------

Deno.test("formatPodioError: surfaces BOTH machine codes, not just the status", () => {
  const message = formatPodioError(
    401,
    "GET",
    "/user/status",
    JSON.stringify(BAD_TOKEN_401),
  );
  assert(message.includes("401"));
  assert(message.includes("unauthorized"), "the `error` code is missing");
  assert(message.includes("expired_token"), "the `error_description` code is missing");
  assert(message.includes("GET /user/status"));
});

Deno.test("formatPodioError: falls back to the raw body when it is not JSON", () => {
  const message = formatPodioError(502, "GET", "/item/1", "<html>bad gateway</html>");
  assert(message.includes("502"));
  assert(message.includes("bad gateway"));
});

Deno.test("formatPodioError: explains a 409 as the revision conflict it is", () => {
  const body = JSON.stringify({ error: "conflict", error_description: "revision_conflict" });
  const message = formatPodioError(409, "PUT", "/item/1", body);
  assert(message.includes("the item changed since the revision you supplied"));
});

/**
 * Podio throttles with 420, from its own client's status switch. A retry policy
 * watching for 429 never fires, so the message has to say it.
 */
Deno.test("formatPodioError: names throttling on 420, the status Podio actually uses", () => {
  assertEquals(THROTTLED_STATUS, 420);
  const body = JSON.stringify({ error: "rate_limit", error_description: "slow down" });
  assert(formatPodioError(420, "GET", "/item/1", body).includes("throttling"));
  assert(!formatPodioError(429, "GET", "/item/1", body).includes("throttling"));
});

// --- the classification that a status code cannot make ----------------------

/**
 * Measured 2026-08-11: Podio answers 401 for a missing credential AND for a
 * rejected one, and the bodies differ in exactly one field. Deciding from the
 * status would conflate "reconnect" with "refresh".
 */
Deno.test("classifyAuthFailure: separates the two 401s by body, not status", () => {
  assertEquals(classifyAuthFailure(401, NO_CREDENTIAL_401), "missing");
  assertEquals(classifyAuthFailure(401, BAD_TOKEN_401), "rejected");
  assertEquals(
    NO_CREDENTIAL_401.error,
    BAD_TOKEN_401.error,
    "the two 401s share an `error` code — only `error_description` separates them",
  );
});

Deno.test("classifyAuthFailure: 403 is its own kind, and an unreadable body is not a 401", () => {
  assertEquals(classifyAuthFailure(403, { error: "forbidden" }), "forbidden");
  // A 401 whose body could not be parsed is still a rejection — the credential
  // reached Podio and was refused.
  assertEquals(classifyAuthFailure(401, null), "rejected");
  assertEquals(classifyAuthFailure(500, null), "other");
  assertEquals(classifyAuthFailure(404, null), "other");
});

Deno.test("classifyAuthFailure: the 400 empty-header case is not read as a missing credential", () => {
  // `Authorization: OAuth2 ` (empty token) answers 400 "Invalid authorization
  // header" — a malformed credential, not an absent one.
  const body = {
    error: "Invalid authorization header",
    error_description: "Invalid authorization header",
  };
  assertEquals(classifyAuthFailure(400, body), "other");
});

// --- the client --------------------------------------------------------------

Deno.test("PodioClient: GET builds the documented URL and asks for JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ org_id: 1 }] }]);
  const out = await new PodioClient(ctx).json<unknown[]>("/org/");
  assertEquals(out, [{ org_id: 1 }]);
  assertEquals(calls[0].url, "https://api.podio.com/org/");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].body, null);
});

Deno.test("PodioClient: a body is sent as JSON with the matching content type", async () => {
  const { ctx, calls } = mockCtx([{ body: { item_id: 5 } }]);
  await new PodioClient(ctx).json("/item/app/1/", { method: "POST", body: { fields: { a: 1 } } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"fields":{"a":1}}');
});

Deno.test("PodioClient: array query values join with a semicolon, Podio's documented list form", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new PodioClient(ctx).json("/task/", {
    query: { reference: ["item:1", "item:2"], limit: 30, completed: "false", skipped: "" },
  });
  const query = queryOf(calls[0].url);
  assertEquals(query.reference, "item:1;item:2");
  assertEquals(query.limit, "30");
  assertEquals(query.completed, "false");
  assertEquals(query.skipped, undefined, "an empty query value must not be sent");
});

Deno.test("PodioClient: 204 and an empty body both yield undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new PodioClient(ctx);
  assertEquals(await client.json("/item/1"), undefined);
  assertEquals(await client.json("/item/2"), undefined);
});

Deno.test("PodioClient.status: reports the status of a bodyless response", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await new PodioClient(ctx).status("/item/1", { method: "DELETE" }), 204);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("PodioClient: a non-2xx throws with both of Podio's codes in the message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: "forbidden", error_description: "no_write" },
  }]);
  const error = await assertRejects(
    () => new PodioClient(ctx).json("/item/1", { method: "PUT", body: {} }),
    Error,
  );
  assert(error.message.includes("403"));
  assert(error.message.includes("forbidden"));
  assert(error.message.includes("no_write"));
  assertEquals(pathOf("https://api.podio.com/item/1"), "/item/1");
});

/**
 * The client never sets an auth header — that is `sign`'s job, and `sign` is the
 * only hook handed the credential. If this ever changes, every action becomes a
 * place a credential can be read.
 */
Deno.test("PodioClient: sends no auth header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new PodioClient(ctx).json("/oauth/scope");
  for (const name of Object.keys(calls[0].headers)) {
    assert(
      name !== "authorization",
      "the client set an auth header — signing is the auth hook's job",
    );
  }
});
