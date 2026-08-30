import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_BASE,
  API_PREFIX,
  compact,
  flattenMessage,
  formatTeachableError,
  TeachableClient,
  truncate,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: base host and prefix", () => {
  assertEquals(API_BASE, "https://developers.teachable.com");
  assertEquals(API_PREFIX, "/v1");
});

Deno.test("compact: drops undefined, null and empty string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "keep" }),
    { d: false, e: 0, f: "keep" },
  );
});

Deno.test("truncate: leaves short text alone, trims long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(700);
  const out = truncate(long, 600);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"));
});

Deno.test("flattenMessage: passes a string through, joins an array", () => {
  assertEquals(flattenMessage("one"), "one");
  assertEquals(flattenMessage(["one", "two"]), "one; two");
  assertEquals(flattenMessage(undefined), undefined);
});

Deno.test("formatTeachableError: includes the message and request_id", () => {
  const raw = JSON.stringify({ message: "Invalid authentication credentials", request_id: "r1" });
  const out = formatTeachableError(401, "GET", "/v1/courses", raw);
  assert(out.includes("Invalid authentication credentials"), out);
  assert(out.includes("r1"), out);
});

Deno.test("formatTeachableError: a 429 names the rate limit and how to recover", () => {
  const raw = JSON.stringify({ message: "API rate limit exceeded" });
  const out = formatTeachableError(429, "GET", "/v1/courses", raw);
  assert(/rate-limited/i.test(out), out);
  assert(/RateLimit-Reset/i.test(out), out);
});

Deno.test("formatTeachableError: falls back to the raw body when it is not JSON", () => {
  const out = formatTeachableError(500, "GET", "/v1/courses", "upstream exploded");
  assert(out.includes("upstream exploded"), out);
});

Deno.test("TeachableClient.json: builds the full URL and parses the JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { courses: [] } }]);
  const body = await new TeachableClient(ctx).json<{ courses: unknown[] }>("/courses");

  assertEquals(calls[0].url, "https://developers.teachable.com/v1/courses");
  assertEquals(calls[0].method, "GET");
  assertEquals(body.courses, []);
});

Deno.test("TeachableClient.json: drops undefined/null/empty query values, keeps the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: { courses: [] } }]);
  await new TeachableClient(ctx).json("/courses", {
    query: { name: undefined, is_published: false, per: 20, author_bio_id: null },
  });

  assertEquals(pathOf(calls[0].url), "/v1/courses");
  assertEquals(queryOf(calls[0].url), { is_published: "false", per: "20" });
});

Deno.test("TeachableClient.json: a 204 returns undefined rather than parsing an empty body", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  assertEquals(await new TeachableClient(ctx).json("/enroll", { method: "POST" }), undefined);
});

Deno.test("TeachableClient.json: sends a JSON body with content-type on POST", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  await new TeachableClient(ctx).json("/enroll", {
    method: "POST",
    body: { user_id: 1, course_id: 2 },
  });

  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { user_id: 1, course_id: 2 });
});

Deno.test("TeachableClient.status: returns the status code for a 204-on-success endpoint", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new TeachableClient(ctx).status("/unenroll", { method: "POST", body: {} }),
    204,
  );
});

Deno.test("TeachableClient: a non-ok response throws a formatted error, not a raw status", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { message: "Invalid authentication credentials", request_id: "r1" } },
  ]);
  await assertRejects(
    () => new TeachableClient(ctx).json("/courses"),
    Error,
    "Invalid authentication credentials",
  );
});
