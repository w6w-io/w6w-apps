import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  asTextOrJson,
  boolFlag,
  compact,
  encodeId,
  formatLokaliseError,
  LokaliseClient,
  readRateLimit,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

// --- compact -----------------------------------------------------------

Deno.test("compact: drops undefined, null and empty string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

// --- asOptionalJson / asJson --------------------------------------------

Deno.test("asOptionalJson: passes a non-string value through unchanged", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
});

Deno.test("asOptionalJson: parses a JSON string", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
});

Deno.test("asOptionalJson: undefined/null/empty stay undefined", () => {
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson(null, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws a labelled error on invalid JSON", () => {
  assertThrows(() => asOptionalJson("not json", "Keys"), Error, "Keys is not valid JSON");
});

Deno.test("asJson: throws when the value is absent", () => {
  assertThrows(() => asJson(undefined, "Keys"), Error, "Keys is required");
});

Deno.test("asJson: returns the parsed value when present", () => {
  assertEquals(asJson("[1,2]", "Keys"), [1, 2]);
});

// --- asTextOrJson --------------------------------------------------------

Deno.test("asTextOrJson: a plain translation string is NOT treated as invalid JSON", () => {
  assertEquals(asTextOrJson("Quick brown fox"), "Quick brown fox");
});

Deno.test("asTextOrJson: a JSON-object-shaped string is parsed (plural translation)", () => {
  assertEquals(asTextOrJson('{"one":"1 apple","other":"apples"}'), {
    one: "1 apple",
    other: "apples",
  });
});

Deno.test("asTextOrJson: a string starting with { that is not valid JSON falls back to text", () => {
  assertEquals(asTextOrJson("{not json}"), "{not json}");
});

Deno.test("asTextOrJson: a non-string value passes through unchanged", () => {
  assertEquals(asTextOrJson({ one: "x" }), { one: "x" });
});

Deno.test("asTextOrJson: undefined/null/empty stay undefined", () => {
  assertEquals(asTextOrJson(undefined), undefined);
  assertEquals(asTextOrJson(null), undefined);
  assertEquals(asTextOrJson(""), undefined);
});

// --- boolFlag / toList / truncate / encodeId ------------------------------

Deno.test("boolFlag: true -> 1, false -> 0, undefined -> undefined", () => {
  assertEquals(boolFlag(true), 1);
  assertEquals(boolFlag(false), 0);
  assertEquals(boolFlag(undefined), undefined);
});

Deno.test("toList: splits a comma string, passes an array through, drops empties", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["a", "b"]), ["a", "b"]);
  assertEquals(toList(""), undefined);
  assertEquals(toList(undefined), undefined);
});

Deno.test("truncate: leaves short text alone, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"));
});

Deno.test("encodeId: escapes path-breaking characters", () => {
  assertEquals(encodeId("a/b?c"), encodeURIComponent("a/b?c"));
  assertEquals(encodeId(12345), "12345");
});

// --- readRateLimit ---------------------------------------------------------

Deno.test("readRateLimit: reads the first number out of each rate-limit header", () => {
  const res = new Response(null, {
    headers: {
      "x-ratelimit-limit": "10, 10;w=1, 10;w=1",
      "x-ratelimit-remaining": "9",
      "x-ratelimit-reset": "1",
    },
  });
  assertEquals(readRateLimit(res), { limit: 10, remaining: 9, resetSeconds: 1 });
});

Deno.test("readRateLimit: absent headers read as undefined, not zero", () => {
  const res = new Response(null);
  assertEquals(readRateLimit(res), {
    limit: undefined,
    remaining: undefined,
    resetSeconds: undefined,
  });
});

// --- formatLokaliseError ----------------------------------------------------

Deno.test("formatLokaliseError: renders the vendor's message and code", () => {
  const msg = formatLokaliseError(
    404,
    "GET",
    "/projects/x",
    JSON.stringify(errorBody("Not Found", 404)),
  );
  assert(msg.includes("Lokalise 404"));
  assert(msg.includes("Not Found"));
});

Deno.test("formatLokaliseError: shows a differing numeric code alongside the HTTP status", () => {
  const msg = formatLokaliseError(
    400,
    "GET",
    "/projects/x",
    JSON.stringify(errorBody("Not Found", 404)),
  );
  assert(msg.includes("400"));
  assert(msg.includes("code 404"));
});

Deno.test("formatLokaliseError: falls back to the raw body when it is not JSON", () => {
  const msg = formatLokaliseError(500, "GET", "/x", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("formatLokaliseError: 429 mentions the documented rate limit", () => {
  const msg = formatLokaliseError(
    429,
    "GET",
    "/x",
    JSON.stringify(errorBody("Too many requests. Cool your jets and try again in a bit", 429)),
  );
  assert(/6 requests\/second/.test(msg));
});

// --- LokaliseClient ----------------------------------------------------------

Deno.test("LokaliseClient.json: sends the token-less accept header and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { project_id: "p1" } }]);
  const out = await new LokaliseClient(ctx).json("/projects/p1");
  assertEquals(out, { project_id: "p1" });
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1");
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("LokaliseClient.json: a POST body is JSON-encoded with the content-type header", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new LokaliseClient(ctx).json("/projects", { method: "POST", body: { name: "x" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ name: "x" }));
});

Deno.test("LokaliseClient.json: query values are set, empties dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new LokaliseClient(ctx).json("/projects", {
    query: { a: "1", b: undefined, c: "", d: 0 },
  });
  assertEquals(queryOf(calls[0].url), { a: "1", d: "0" });
});

Deno.test("LokaliseClient.json: throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Not Found", 404) }]);
  await assertRejectsMessage(
    () => new LokaliseClient(ctx).json("/projects/missing"),
    "Not Found",
  );
});

Deno.test("LokaliseClient.list: unwraps the named array and reads pagination headers", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { projects: [{ project_id: "p1" }] },
      headers: {
        "content-type": "application/json",
        "x-total-count": "42",
        "x-pagination-next-cursor": "cur_abc",
      },
    },
  ]);
  const page = await new LokaliseClient(ctx).list("/projects", "projects");
  assertEquals(page.items, [{ project_id: "p1" }]);
  assertEquals(page.totalCount, 42);
  assertEquals(page.nextCursor, "cur_abc");
  assertEquals(pathOf(calls[0].url), "/api2/projects");
});

Deno.test("LokaliseClient.list: absent pagination headers read as undefined, and an absent array key is an empty list", async () => {
  const { ctx } = mockCtx([{ body: { project_id: "p1" } }]);
  const page = await new LokaliseClient(ctx).list("/projects/p1/comments", "comments");
  assertEquals(page.items, []);
  assertEquals(page.totalCount, undefined);
  assertEquals(page.nextCursor, undefined);
});

Deno.test("LokaliseClient.status: returns the HTTP status of a no-body response", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { webhook_deleted: true } }]);
  const status = await new LokaliseClient(ctx).status("/projects/p1/webhooks/w1", {
    method: "DELETE",
  });
  assertEquals(status, 200);
});

async function assertRejectsMessage(fn: () => Promise<unknown>, substring: string): Promise<void> {
  try {
    await fn();
    throw new Error("expected rejection, got success");
  } catch (e) {
    assert(e instanceof Error);
    assert(e.message.includes(substring), e.message);
  }
}
