import { assert, assertEquals } from "@std/assert";
import {
  asOptionalJson,
  compact,
  formatGivebutterError,
  GivebutterClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false/0", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }),
    { a: 1, e: false, f: 0 },
  );
});

Deno.test("toList: splits a comma string, trims, drops empties; passes an array through", () => {
  assertEquals(toList("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", "y"]), ["x", "y"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("asOptionalJson: parses a JSON string, passes a non-string through, rejects garbage", () => {
  assertEquals(asOptionalJson<number[]>("[1,2]", "x"), [1, 2]);
  assertEquals(asOptionalJson([1, 2], "x"), [1, 2]);
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  let threw = false;
  try {
    asOptionalJson("{not json", "settings");
  } catch (e) {
    threw = true;
    assert(String(e).includes("settings"));
  }
  assert(threw, "expected asOptionalJson to throw on invalid JSON");
});

Deno.test("truncate: leaves a short string alone, truncates and annotates a long one", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(900);
  const out = truncate(long, 800);
  assert(out.length < long.length);
  assert(out.includes("900 bytes truncated"));
});

/**
 * The shape actually observed on the wire — `{"error": {"message": "..."}}`
 * — not the flat `{"message": "..."}` every docs page shows.
 */
Deno.test("formatGivebutterError: reads the nested error.message shape", () => {
  const msg = formatGivebutterError(
    401,
    "GET",
    "/v1/campaigns",
    JSON.stringify(errorBody("Unauthorized")),
  );
  assert(msg.includes("Unauthorized"), msg);
  assert(msg.includes("401"), msg);
});

Deno.test("formatGivebutterError: falls back to a flat message shape", () => {
  const msg = formatGivebutterError(
    403,
    "GET",
    "/v1/funds/1",
    JSON.stringify({ message: "This action is unauthorized." }),
  );
  assert(msg.includes("This action is unauthorized."), msg);
});

Deno.test("formatGivebutterError: appends field-level validation errors when present", () => {
  const msg = formatGivebutterError(
    422,
    "POST",
    "/v1/funds",
    JSON.stringify({ message: "The given data was invalid.", errors: { name: ["is required"] } }),
  );
  assert(msg.includes("name: is required"), msg);
});

/** An unparseable body (the marketing site's HTML 404) must not throw — it is quoted raw. */
Deno.test("formatGivebutterError: an unparseable body is quoted rather than dropped", () => {
  const msg = formatGivebutterError(404, "GET", "/v1/funds/1", "<!DOCTYPE html>...Butter 404...");
  assert(msg.includes("Butter 404"), msg);
});

Deno.test("formatGivebutterError: a 429 mentions the rate-limit headers", () => {
  const msg = formatGivebutterError(
    429,
    "GET",
    "/v1/campaigns",
    JSON.stringify(errorBody("Too Many Requests")),
  );
  assert(/x-ratelimit/i.test(msg), msg);
});

Deno.test("GivebutterClient.data: unwraps the {data: ...} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", name: "Acme" }) }]);
  const out = await new GivebutterClient(ctx).data("/funds/1");

  assertEquals(pathOf(calls[0].url), "/v1/funds/1");
  assertEquals(out, { id: "1", name: "Acme" });
});

Deno.test("GivebutterClient.page: returns the full {data, links, meta} envelope", async () => {
  const { ctx } = mockCtx([{ body: pageEnvelope([{ id: "1" }], { total: 1 }) }]);
  const out = await new GivebutterClient(ctx).page("/funds");

  assertEquals(out.data, [{ id: "1" }]);
  assertEquals(out.meta.total, 1);
  assertEquals(out.links.next, null);
});

Deno.test("GivebutterClient.status: returns the HTTP status without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new GivebutterClient(ctx).status("/funds/1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("GivebutterClient: throws a formatted error on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  let threw = false;
  try {
    await new GivebutterClient(ctx).data("/campaigns/1");
  } catch (e) {
    threw = true;
    assert(String(e).includes("Unauthorized"));
  }
  assert(threw, "expected a non-2xx response to throw");
});

Deno.test("GivebutterClient: query params drop unset values and array-join multi-valued ones", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([]) }]);
  await new GivebutterClient(ctx).page("/contacts", {
    query: { firstName: "Ada", lastName: undefined, tags: ["a", "b"] },
  });

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("firstName"), "Ada");
  assertEquals(url.searchParams.has("lastName"), false);
  assertEquals(url.searchParams.get("tags"), "a,b");
});
