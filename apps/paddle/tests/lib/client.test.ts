import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_KEY_PATTERN,
  asOptionalJson,
  compact,
  environmentFromApiKey,
  environmentFromConnection,
  formatPaddleError,
  hostForEnvironment,
  LEGACY_API_KEY_PATTERN,
  PaddleClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { envelope, errorBody, LIVE_KEY, mockPaddleCtx, SANDBOX_KEY } from "../_helpers.ts";

Deno.test("environmentFromApiKey: reads the environment out of the prefix", () => {
  assertEquals(environmentFromApiKey(LIVE_KEY), "live");
  assertEquals(environmentFromApiKey(SANDBOX_KEY), "sandbox");
});

/**
 * A legacy key genuinely does not say which environment it belongs to, and
 * guessing would point sandbox traffic at production. `undefined` is the honest
 * answer and the callers handle it explicitly.
 */
Deno.test("environmentFromApiKey: a legacy key yields undefined, not a guess", () => {
  assertEquals(
    environmentFromApiKey("da3f01dbed7a549cf0d8eb454bf5fded90d021f9975eba5cae1"),
    undefined,
  );
  assertEquals(environmentFromApiKey(""), undefined);
});

Deno.test("hostForEnvironment: sandbox gets its own host, everything else is live", () => {
  assertEquals(hostForEnvironment("live"), "api.paddle.com");
  assertEquals(hostForEnvironment("sandbox"), "sandbox-api.paddle.com");
  assertEquals(hostForEnvironment(undefined), "api.paddle.com");
});

Deno.test("API_KEY_PATTERN: matches Paddle's published format and rejects near-misses", () => {
  assert(API_KEY_PATTERN.test(LIVE_KEY));
  assert(API_KEY_PATTERN.test(SANDBOX_KEY));
  assertEquals(LIVE_KEY.length, 69, "Paddle documents keys as 69 characters");
  assertEquals(LIVE_KEY.split("_").length - 1, 5, "…with five underscores");
  assert(!API_KEY_PATTERN.test(LIVE_KEY.slice(0, -1)), "truncated key must not match");
  assert(
    !API_KEY_PATTERN.test("pdl_prod_apikey_01gtgztp8f4kek3yd4g1wrksa3_q6TGTJyvoIz7LDtXT65bX7_AQO"),
  );
});

Deno.test("LEGACY_API_KEY_PATTERN: 50 lowercase alphanumerics, per the vendor's description", () => {
  assert(LEGACY_API_KEY_PATTERN.test("a".repeat(50)));
  assert(!LEGACY_API_KEY_PATTERN.test("a".repeat(49)));
  assert(!LEGACY_API_KEY_PATTERN.test("A".repeat(50)), "legacy keys are lowercase only");
});

Deno.test("environmentFromConnection: reads display, ignoring anything unrecognised", () => {
  const { ctx } = mockPaddleCtx([], "sandbox");
  assertEquals(environmentFromConnection(ctx.connection), "sandbox");
  assertEquals(environmentFromConnection(undefined), undefined);
  assertEquals(
    environmentFromConnection({ display: { environment: "staging" } } as never),
    undefined,
  );
});

Deno.test("compact: drops unset keys but keeps false and 0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: "x" }),
    { a: 1, e: false, f: 0, g: "x" },
  );
});

Deno.test("toList: accepts an array, a bare string, or a comma-separated string", () => {
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList("a"), ["a"]);
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(","), undefined);
});

Deno.test("asOptionalJson: passes objects through and parses strings", () => {
  assertEquals(asOptionalJson({ a: 1 }, "X"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "X"), { a: 1 });
  assertEquals(asOptionalJson("", "X"), undefined);
});

Deno.test("asOptionalJson: names the field when the string is not JSON", () => {
  let message = "";
  try {
    asOptionalJson("{nope", "Items");
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message, "Items is not valid JSON");
});

Deno.test("truncate: leaves short text alone and reports what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  const long = truncate("x".repeat(50), 10);
  assert(long.startsWith("x".repeat(10)));
  assert(long.includes("50 bytes truncated"));
});

/**
 * The error path is where Paddle's response is most useful and most easily
 * thrown away. `code`, `detail`, the per-field validation list and the
 * `request_id` Paddle support asks for must all survive.
 */
Deno.test("formatPaddleError: surfaces code, detail, field errors and the request id", () => {
  const raw = JSON.stringify(
    errorBody("invalid_field", "Request does not pass validation.", [
      { field: "description", message: "maximum length of 256 exceeded" },
    ]),
  );
  const msg = formatPaddleError(400, "POST", "/products", raw);
  assert(msg.includes("400"), msg);
  assert(msg.includes("invalid_field"), msg);
  assert(msg.includes("POST /products"), msg);
  assert(msg.includes("Request does not pass validation."), msg);
  assert(msg.includes("description: maximum length of 256 exceeded"), msg);
  assert(msg.includes("49a0369b-a6de-4ba8-a03b-28e0cdc5f000"), msg);
});

Deno.test("formatPaddleError: falls back to the raw body when it is not Paddle's shape", () => {
  const msg = formatPaddleError(502, "GET", "/products", "<html>bad gateway</html>");
  assert(msg.includes("502"), msg);
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

Deno.test("client: builds against the connection's environment host", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }], "sandbox");
  await new PaddleClient(ctx).request("/products");
  assertEquals(calls[0].url, "https://sandbox-api.paddle.com/products");
});

/**
 * Paddle takes multi-valued query parameters as ONE comma-separated value, not
 * as a repeated key. Getting this wrong silently filters on only the last value
 * on some endpoints and 400s on others.
 */
Deno.test("client: joins array query values with commas rather than repeating the key", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await new PaddleClient(ctx).request("/products", {
    query: { status: ["active", "archived"], include: "prices" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("status"), "active,archived");
  assertEquals(url.searchParams.getAll("status").length, 1);
  assertEquals(url.searchParams.get("include"), "prices");
});

Deno.test("client: drops empty query values instead of sending blanks", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await new PaddleClient(ctx).request("/products", {
    query: { a: undefined, b: null, c: "", d: 0, e: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("b"), null);
  assertEquals(url.searchParams.get("c"), null);
  // 0 and false are real values, not absence.
  assertEquals(url.searchParams.get("d"), "0");
  assertEquals(url.searchParams.get("e"), "false");
});

Deno.test("client: request unwraps `data`, envelope keeps `meta`", async () => {
  const { ctx } = mockPaddleCtx([
    { body: envelope([{ id: "pro_1" }], { has_more: true, next: "…" }) },
    { body: envelope([{ id: "pro_1" }], { has_more: true, next: "…" }) },
  ]);
  const client = new PaddleClient(ctx);
  assertEquals(await client.request("/products"), [{ id: "pro_1" }]);
  const env = await client.envelope("/products");
  assertEquals(env.meta?.pagination?.has_more, true);
});

Deno.test("client: a 204 resolves to undefined rather than throwing on an empty body", async () => {
  const { ctx } = mockPaddleCtx([{ status: 204 }]);
  assertEquals(
    await new PaddleClient(ctx).request("/notification-settings/ntfset_1", {
      method: "DELETE",
    }),
    undefined,
  );
});

Deno.test("client: a JSON body is sent with a content-type, a GET is not", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope({}) }, { body: envelope({}) }]);
  const client = new PaddleClient(ctx);
  await client.request("/customers", { method: "POST", body: { email: "a@b.com" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"email":"a@b.com"}');
  await client.request("/customers");
  assertEquals(calls[1].headers["content-type"], undefined);
});

Deno.test("client: a non-2xx throws with Paddle's own error text", async () => {
  const { ctx } = mockPaddleCtx([
    { status: 404, body: errorBody("not_found", "Entity pro_01 not found") },
  ]);
  await assertRejects(
    async () => {
      await new PaddleClient(ctx).request("/products/pro_01");
    },
    Error,
    "not_found",
  );
});

/** The action worker must never see or build an Authorization header. */
Deno.test("client: never sets an authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockPaddleCtx([{ body: envelope([]) }]);
  await new PaddleClient(ctx).request("/products");
  assertEquals(calls[0].headers["authorization"], undefined);
});
