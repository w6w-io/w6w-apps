import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_V1_BASE,
  asJson,
  asOptionalJson,
  ChatbaseClient,
  ChatbaseV1Client,
  compact,
  formatChatbaseError,
  HOST,
  readRateLimit,
  toCommaList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, page, pathOf, queryOf, v1ErrorBody, wrapped } from "../_helpers.ts";

Deno.test("client: the base URLs and host are Chatbase's declared servers", () => {
  assertEquals(API_BASE, "https://www.chatbase.co/api/v2");
  assertEquals(API_V1_BASE, "https://www.chatbase.co/api/v1");
  assertEquals(HOST, "www.chatbase.co");
});

Deno.test("client: request() returns the body verbatim, no unwrapping", async () => {
  const { ctx } = mockCtx([{ body: page([{ id: "a1" }]) }]);
  const out = await new ChatbaseClient(ctx).request("/agents");
  assertEquals(out, page([{ id: "a1" }]));
});

Deno.test("client: unwrap() extracts the data key from the chat-family shape", async () => {
  const { ctx } = mockCtx([{ body: wrapped({ id: "msg_1" }) }]);
  assertEquals(await new ChatbaseClient(ctx).unwrap("/agents/a1/chat"), { id: "msg_1" });
});

/**
 * A body with no `data` key is returned whole — matters for the endpoints
 * that answer a bare object regardless of which method reads them.
 */
Deno.test("client: unwrap() passes an un-enveloped body through unchanged", async () => {
  const { ctx } = mockCtx([{ body: { id: "x" } }]);
  assertEquals(await new ChatbaseClient(ctx).unwrap("/x"), { id: "x" });
});

Deno.test("client: a 204 yields undefined rather than a parse error", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new ChatbaseClient(ctx).request("/agents/a1"), undefined);
});

Deno.test("client: the ChatbaseV1Client targets the v1 host, not v2", async () => {
  const { ctx, calls } = mockCtx([{ body: { collectedCustomers: [] } }]);
  await new ChatbaseV1Client(ctx).request("/get-leads");
  assertEquals(calls[0].url.startsWith(API_V1_BASE), true, calls[0].url);
});

Deno.test("client: query values that are empty, null or undefined are dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new ChatbaseClient(ctx).request("/agents", {
    query: { a: "x", b: undefined, c: null, d: "", e: 0, f: false },
  });
  assertEquals(queryOf(calls[0].url), { a: "x", e: "0", f: "false" });
});

Deno.test("client: a JSON body sets the content type Chatbase requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a1" } }]);
  await new ChatbaseClient(ctx).request("/agents", { method: "POST", body: { name: "Bot" } });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"name":"Bot"}');
});

Deno.test("client: the path is built under /api/v2", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await new ChatbaseClient(ctx).request("/agents");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents");
});

Deno.test("client: a non-2xx response throws with the vendor's error code", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("AUTH_INVALID_API_KEY", "The API key is not valid.") },
  ]);
  const err = await assertRejects(() => new ChatbaseClient(ctx).request("/agents"), Error);

  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("AUTH_INVALID_API_KEY"), err.message);
  assert(err.message.includes("/api/v2/agents"), err.message);
});

Deno.test("client: lastRateLimit is captured from the most recent response", async () => {
  const { ctx } = mockCtx([{
    body: page([]),
    headers: {
      "content-type": "application/json",
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "42",
    },
  }]);
  const client = new ChatbaseClient(ctx);
  await client.request("/agents");
  assertEquals(client.lastRateLimit?.limit, 100);
  assertEquals(client.lastRateLimit?.remaining, 42);
});

// --- error formatting -------------------------------------------------------

Deno.test("formatChatbaseError: v2 shape keeps the machine code and message", () => {
  const msg = formatChatbaseError(
    404,
    "GET",
    "/api/v2/agents/a1",
    JSON.stringify(errorBody("AGENT_NOT_FOUND", "Agent doesn't exist.")),
  );
  assertEquals(
    msg,
    "Chatbase 404 AGENT_NOT_FOUND for GET /api/v2/agents/a1: Agent doesn't exist.",
  );
});

Deno.test("formatChatbaseError: v2 details are included when present", () => {
  const msg = formatChatbaseError(
    400,
    "POST",
    "/api/v2/agents",
    JSON.stringify(errorBody("VALIDATION_INVALID_BODY", "Invalid request", { name: "Required" })),
  );
  assert(msg.includes('"name":"Required"'), msg);
});

Deno.test("formatChatbaseError: falls back to the v1 {message} shape when there's no code", () => {
  const msg = formatChatbaseError(
    401,
    "GET",
    "/api/v1/get-leads",
    JSON.stringify(v1ErrorBody("No API key provided.")),
  );
  assertEquals(msg, "Chatbase 401 for GET /api/v1/get-leads: No API key provided.");
});

Deno.test("formatChatbaseError: a 429 carries the rate-limit budget", () => {
  const msg = formatChatbaseError(
    429,
    "GET",
    "/api/v2/agents",
    JSON.stringify(errorBody("RATE_LIMIT_TOO_MANY_REQUESTS", "Too many requests")),
  );
  assert(/100 requests\/10s/.test(msg), msg);
});

Deno.test("formatChatbaseError: a non-JSON body falls back to the raw text", () => {
  const msg = formatChatbaseError(502, "GET", "/api/v2/agents", "<html>bad gateway</html>");
  assert(msg.includes("<html>bad gateway</html>"), msg);
});

// --- rate limit headers ------------------------------------------------------

Deno.test("readRateLimit: converts the millisecond reset to ISO, reads Retry-After", () => {
  const res = new Response(null, {
    headers: {
      "x-ratelimit-limit": "100",
      "x-ratelimit-remaining": "10",
      "x-ratelimit-reset": "1770681600000",
      "retry-after": "5",
    },
  });
  assertEquals(readRateLimit(res), {
    limit: 100,
    remaining: 10,
    resetAt: new Date(1770681600000).toISOString(),
    retryAfterSeconds: 5,
  });
});

Deno.test("readRateLimit: missing headers yield undefined fields, not zeros", () => {
  const res = new Response(null);
  assertEquals(readRateLimit(res), {
    limit: undefined,
    remaining: undefined,
    resetAt: undefined,
    retryAfterSeconds: undefined,
  });
});

// --- small helpers ------------------------------------------------------------

Deno.test("compact: drops undefined, null and empty string but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("toCommaList: normalises an array, a bare string and a comma-joined string", () => {
  assertEquals(toCommaList(["a", "b"]), "a,b");
  assertEquals(toCommaList("a"), "a");
  assertEquals(toCommaList("a, b ,c"), "a,b,c");
  assertEquals(toCommaList(""), undefined);
  assertEquals(toCommaList(undefined), undefined);
  assertEquals(toCommaList([]), undefined);
});

Deno.test("asOptionalJson: accepts a parsed value or the string a user typed", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: an unparsable string raises a labeled error", () => {
  let message = "";
  try {
    asOptionalJson("not json", "Variables");
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Variables is not valid JSON");
});

Deno.test("asJson: a missing value is an error, not a silent undefined", () => {
  assertEquals(asJson('{"a":1}', "Questions"), { a: 1 });
  let message = "";
  try {
    asJson(undefined, "Questions");
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Questions is required");
});

Deno.test("truncate: says how much it dropped", () => {
  assertEquals(truncate("abc", 10), "abc");
  const out = truncate("x".repeat(50), 10);
  assert(out.startsWith("x".repeat(10)));
  assert(out.includes("50 bytes truncated"), out);
});
