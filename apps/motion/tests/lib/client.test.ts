import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_BASE,
  BETA,
  flag,
  formatMotionError,
  messageText,
  MotionClient,
  omitUndefined,
  optionalJson,
  requiredJson,
  toStringList,
  truncate,
  V1,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

Deno.test("client: one origin, two version prefixes", () => {
  assertEquals(API_BASE, "https://api.usemotion.com");
  assertEquals(V1, "/v1");
  // Custom fields are served under /beta with no /v1 alias — the wrong prefix is
  // a router 404, not a redirect.
  assertEquals(BETA, "/beta");
});

// --- the content-type guard -------------------------------------------------

/**
 * Motion validates `Content-Type: application/json` before routing AND before
 * auth, so a body-carrying request without it is refused with a 400 about
 * headers on paths that do not exist and with no credential attached.
 */
Deno.test("client: a body always carries content-type, even an empty one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new MotionClient(ctx);

  await client.json(`${V1}/tasks`, { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"x"}');

  await client.json(`${V1}/tasks`, { method: "POST", body: {} });
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, "{}");
});

Deno.test("client: a request with no body sends no content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await new MotionClient(ctx).status(`${V1}/tasks/t1`, { method: "DELETE" });

  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].body, null);
});

// --- query building ---------------------------------------------------------

Deno.test("client: undefined, null and empty-string query values are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new MotionClient(ctx).json(`${V1}/tasks`, {
    query: { a: "1", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "1", e: "0", f: "false" });
});

/**
 * `false` is expressed as absence rather than as the string "false": Motion
 * publishes no example request, and a naive handler reads the non-empty string
 * "false" as true. Off is the documented default for every boolean this app
 * sends.
 */
Deno.test("client: flag renders true and omits false", () => {
  assertEquals(flag(true), "true");
  assertEquals(flag(false), undefined);
  assertEquals(flag(undefined), undefined);
});

// --- response shapes --------------------------------------------------------

Deno.test("client: page reads the vendor's collection key and the meta envelope", async () => {
  const { ctx } = mockCtx([
    { body: { meta: { nextCursor: "c2", pageSize: 2 }, tasks: [{ id: "a" }, { id: "b" }] } },
  ]);
  assertEquals(await new MotionClient(ctx).page(`${V1}/tasks`, "tasks"), {
    items: [{ id: "a" }, { id: "b" }],
    meta: { nextCursor: "c2", pageSize: 2 },
  });
});

Deno.test("client: page tolerates a missing collection and a missing meta", async () => {
  const { ctx } = mockCtx([{ body: { meta: {} } }, { body: {} }]);
  const client = new MotionClient(ctx);
  assertEquals(await client.page(`${V1}/projects`, "projects"), { items: [], meta: {} });
  assertEquals(await client.page(`${V1}/projects`, "projects"), { items: [], meta: {} });
});

Deno.test("client: a 204 and an empty body both read as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new MotionClient(ctx);
  assertEquals(await client.json(`${V1}/tasks/t1`), undefined);
  assertEquals(await client.json(`${V1}/tasks/t1`), undefined);
});

Deno.test("client: a bare array is returned as-is by json", async () => {
  const { ctx } = mockCtx([{ body: [{ name: "Todo" }] }]);
  assertEquals(await new MotionClient(ctx).json(`${V1}/statuses`), [{ name: "Todo" }]);
});

// --- ids and paths ----------------------------------------------------------

Deno.test("client: the /beta prefix survives into the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new MotionClient(ctx).json(`${BETA}/workspaces/ws1/custom-fields`);
  assertEquals(pathOf(calls[0].url), "/beta/workspaces/ws1/custom-fields");
});

// --- errors -----------------------------------------------------------------

Deno.test("client: an error status throws with Motion's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "Cannot GET /v1/x", statusCode: 404 },
  }]);
  await assertRejects(
    async () => {
      await new MotionClient(ctx).json(`${V1}/x`);
    },
    Error,
    "Cannot GET /v1/x",
  );
});

Deno.test("format: the content-type guard is explained rather than passed through", () => {
  const message = formatMotionError(
    400,
    "POST",
    "/v1/tasks",
    JSON.stringify({
      message: "Invalid Headers",
      error: "Content-Type must be application/json",
      statusCode: 400,
    }),
  );
  assert(message.includes("before routing and before auth"), message);
});

Deno.test("format: a 401 says what it could be, because Motion will not say", () => {
  const message = formatMotionError(401, "GET", "/v1/tasks", JSON.stringify(UNAUTHORIZED_BODY));
  assert(/missing, empty, revoked/.test(message), message);
});

Deno.test("format: a 429 quotes the ceiling that produced it", () => {
  const message = formatMotionError(
    429,
    "GET",
    "/v1/tasks",
    JSON.stringify({ message: "Too Many Requests", statusCode: 429 }),
  );
  assert(/12 requests\/minute/.test(message), message);
});

/**
 * NestJS emits `message` as a string for an HTTP error and as an ARRAY for a
 * validation failure. Only the scalar form was observable without a credential,
 * so both are handled rather than one assumed.
 */
Deno.test("format: an array message is joined rather than rendered as [object Object]", () => {
  assertEquals(
    messageText(["name must be a string", "workspaceId should not be empty"]),
    "name must be a string; workspaceId should not be empty",
  );
  assertEquals(messageText("plain"), "plain");
  assertEquals(messageText(undefined), undefined);

  const message = formatMotionError(
    400,
    "POST",
    "/v1/tasks",
    JSON.stringify({ message: ["name must be a string"], error: "Bad Request", statusCode: 400 }),
  );
  assert(message.includes("name must be a string"), message);
});

Deno.test("format: a non-JSON body falls through to the raw text", () => {
  const message = formatMotionError(502, "GET", "/v1/tasks", "<html>bad gateway</html>");
  assert(message.includes("<html>bad gateway</html>"), message);
});

Deno.test("truncate: keeps a long body readable and says how much it dropped", () => {
  const out = truncate("x".repeat(1000), 100);
  assert(out.startsWith("x".repeat(100)));
  assert(out.includes("1000 bytes truncated"));
  assertEquals(truncate("short", 100), "short");
});

// --- body helpers -----------------------------------------------------------

/**
 * `null` must survive where `undefined` must not: Motion documents
 * `autoScheduled` as `object | null`, and the null is the only way to turn
 * auto-scheduling off.
 */
Deno.test("omitUndefined: drops unset fields and keeps an explicit null", () => {
  assertEquals(omitUndefined({ a: 1, b: undefined, c: null, d: "", e: false }), {
    a: 1,
    c: null,
    e: false,
  });
});

Deno.test("optionalJson: parses text, passes objects through, preserves null", () => {
  assertEquals(optionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(optionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(optionalJson("null", "x"), null);
  assertEquals(optionalJson(null, "x"), null);
  assertEquals(optionalJson(undefined, "x"), undefined);
  assertEquals(optionalJson("", "x"), undefined);
  assertThrows(() => optionalJson("{oops", "Auto-schedule"), Error, "Auto-schedule is not valid");
});

Deno.test("requiredJson: absence is an error, false and 0 are not", () => {
  assertEquals(requiredJson("false", "Value"), false);
  assertEquals(requiredJson(0, "Value"), 0);
  assertThrows(() => requiredJson(undefined, "Value"), Error, "Value is required");
});

Deno.test("toStringList: trims, drops blanks, and collapses an empty list to undefined", () => {
  assertEquals(toStringList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toStringList("a, b"), ["a", "b"]);
  assertEquals(toStringList([]), undefined);
  assertEquals(toStringList(undefined), undefined);
});
