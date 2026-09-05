import { assert, assertEquals } from "@std/assert";
import {
  AweberClient,
  compact,
  encodeId,
  formatAweberError,
  locationId,
  truncate,
} from "../../lib/client.ts";
import { authError, endpointError, entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("encodeId: escapes path-unsafe characters", () => {
  assertEquals(encodeId("123"), "123");
  assertEquals(encodeId("a/b?c"), "a%2Fb%3Fc");
});

Deno.test("locationId: pulls the trailing numeric id off a Location URL", () => {
  assertEquals(
    locationId("https://api.aweber.com/1.0/accounts/123/lists/456/subscribers/789"),
    789,
  );
  assertEquals(locationId(null), undefined);
  assertEquals(locationId("https://api.aweber.com/1.0/accounts/123/lists/456"), 456);
  assertEquals(locationId("not a url"), undefined);
});

Deno.test("formatAweberError: the REST-layer shape (object error with a type)", () => {
  const msg = formatAweberError(
    404,
    "GET",
    "/accounts/1/lists/2",
    JSON.stringify({
      error: { type: "SubListNotFoundError", message: "List does not exist", status: 404 },
    }),
  );
  assert(msg.includes("SubListNotFoundError"));
  assert(msg.includes("List does not exist"));
});

Deno.test("formatAweberError: the RFC 6750 shape (a bare string error)", () => {
  const msg = formatAweberError(
    401,
    "GET",
    "/accounts",
    JSON.stringify({ error: "invalid_token", error_description: "The access token is invalid" }),
  );
  assert(msg.includes("invalid_token"));
  assert(msg.includes("The access token is invalid"));
});

Deno.test("formatAweberError: falls back to the raw body when it isn't JSON", () => {
  const msg = formatAweberError(502, "GET", "/accounts", "<html>Bad Gateway</html>");
  assert(msg.includes("<html>Bad Gateway</html>"));
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long);
  assert(out.length < long.length);
  assert(out.includes("900 bytes truncated"));
});

Deno.test("AweberClient.list: unwraps the entries envelope and builds the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1 }, { id: 2 }]) }]);
  const page = await new AweberClient(ctx).list("/accounts/1/lists", {
    "ws.start": 0,
    "ws.size": 50,
  });

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists");
  assertEquals(queryOf(calls[0].url), { "ws.start": "0", "ws.size": "50" });
  assertEquals(page.entries.length, 2);
  assertEquals(page.total_size, 2);
});

Deno.test("AweberClient.list: omits undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([]) }]);
  await new AweberClient(ctx).list("/accounts/1/lists", {
    "ws.start": undefined,
    name: "",
    foo: "bar",
  });
  assertEquals(queryOf(calls[0].url), { foo: "bar" });
});

Deno.test("AweberClient.json: returns undefined for an empty (e.g. 201) body", async () => {
  const { ctx } = mockCtx([{ status: 201, headers: { location: "https://x/1" }, body: undefined }]);
  const body = await new AweberClient(ctx).json("/accounts/1/lists/2/subscribers", {
    method: "POST",
  });
  assertEquals(body, undefined);
});

Deno.test("AweberClient.json: parses a bare array (the tags endpoint shape)", async () => {
  const { ctx } = mockCtx([{ body: ["alpha", "beta"] }]);
  const tags = await new AweberClient(ctx).json<string[]>("/accounts/1/lists/2/tags");
  assertEquals(tags, ["alpha", "beta"]);
});

Deno.test("AweberClient.raw: exposes the status and Location header directly", async () => {
  const { ctx } = mockCtx([
    {
      status: 201,
      headers: { location: "https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/9" },
    },
  ]);
  const res = await new AweberClient(ctx).raw("/accounts/1/lists/2/subscribers", {
    method: "POST",
  });
  assertEquals(res.status, 201);
  assertEquals(
    res.headers.get("location"),
    "https://api.aweber.com/1.0/accounts/1/lists/2/subscribers/9",
  );
});

Deno.test("AweberClient: sends a JSON content-type only when a body is given", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([]) }, { status: 201, body: undefined }]);
  const client = new AweberClient(ctx);
  await client.list("/accounts");
  await client.raw("/accounts/1/lists/2/subscribers", {
    method: "POST",
    body: { email: "a@b.com" },
  });

  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[1].headers["content-type"], "application/json");
  assertEquals(calls[1].body, JSON.stringify({ email: "a@b.com" }));
});

Deno.test("AweberClient: a non-2xx response throws a formatted error (REST-layer shape)", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: endpointError("ForbiddenError", "Rate Limit Error") },
  ]);
  await assertRejectsMessage(
    () => new AweberClient(ctx).json("/accounts/1/lists/2/subscribers"),
    /ForbiddenError.*Rate Limit Error/,
  );
});

Deno.test("AweberClient: a non-2xx response throws a formatted error (RFC 6750 shape)", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: authError("invalid_token", "The access token is invalid or has expired") },
  ]);
  await assertRejectsMessage(
    () => new AweberClient(ctx).json("/accounts"),
    /invalid_token.*invalid or has expired/,
  );
});

async function assertRejectsMessage(fn: () => Promise<unknown>, pattern: RegExp) {
  try {
    await fn();
  } catch (err) {
    assert(pattern.test((err as Error).message), (err as Error).message);
    return;
  }
  throw new Error("expected a rejection");
}
