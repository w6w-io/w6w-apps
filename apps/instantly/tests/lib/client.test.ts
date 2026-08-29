import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asJson,
  asOptionalJson,
  compact,
  formatInstantlyError,
  InstantlyClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryAllOf } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("asOptionalJson: passes through a non-string, parses a string, undefined on empty", () => {
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws a labeled error on malformed JSON", () => {
  let threw = false;
  try {
    asOptionalJson("{not json", "Widget");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("Widget"));
  }
  assert(threw);
});

Deno.test("asJson: required — throws when absent", () => {
  let threw = false;
  try {
    asJson(undefined, "Leads");
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("Leads"));
  }
  assert(threw);
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
  const out = truncate(long, 600);
  assert(out.length < long.length);
  assert(out.includes("700 bytes truncated"));
});

Deno.test("formatInstantlyError: preserves the vendor's message rather than a bare status code", () => {
  const msg = formatInstantlyError(
    401,
    "GET",
    "/api/v2/campaigns",
    JSON.stringify(errorBody(401, "Unauthorized", "Invalid API key")),
  );
  assert(msg.includes("Invalid API key"));
  assert(msg.includes("401"));
});

Deno.test("formatInstantlyError: names the shared rate limit on 429", () => {
  const msg = formatInstantlyError(429, "GET", "/api/v2/leads", "{}");
  assert(/rate limit/i.test(msg));
});

Deno.test("formatInstantlyError: falls back to the raw body when it isn't the JSON envelope", () => {
  const msg = formatInstantlyError(500, "GET", "/api/v2/campaigns", "upstream exploded");
  assert(msg.includes("upstream exploded"));
});

Deno.test("InstantlyClient.json: builds the full URL and parses the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1" } }]);
  const out = await new InstantlyClient(ctx).json<{ id: string }>("/campaigns/c1");
  assertEquals(calls[0].url, "https://api.instantly.ai/api/v2/campaigns/c1");
  assertEquals(out.id, "c1");
});

Deno.test("InstantlyClient: repeats an array query param as multiple keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [] } }]);
  await new InstantlyClient(ctx).json("/campaigns/analytics", {
    query: { ids: ["a", "b"] },
  });
  assertEquals(queryAllOf(calls[0].url, "ids"), ["a", "b"]);
});

Deno.test("InstantlyClient: a non-ok response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "Unauthorized", "Missing authorization header") },
  ]);
  await assertRejects(
    () => new InstantlyClient(ctx).json("/campaigns"),
    Error,
    "Missing authorization header",
  );
});

Deno.test("InstantlyClient: DELETE with a body sends it as JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 3 } }]);
  await new InstantlyClient(ctx).json("/leads", {
    method: "DELETE",
    body: { campaign_id: "c1" },
  });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/leads");
  assertEquals(JSON.parse(calls[0].body!), { campaign_id: "c1" });
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("InstantlyClient.status: returns the HTTP status for a 204-shaped success", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new InstantlyClient(ctx).status("/emails/threads/t1/mark-as-read", {
    method: "POST",
  });
  assertEquals(status, 204);
});
