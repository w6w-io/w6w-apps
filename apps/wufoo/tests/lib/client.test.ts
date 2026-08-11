import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  API_KEY_PATTERN,
  baseUrlFor,
  formatWufooError,
  IGNORED_PASSWORD,
  normalizeSubdomain,
  subdomainFromConnection,
  truncate,
  unwrap,
  WufooClient,
} from "../../lib/client.ts";
import { FILTER_OPERATORS, mergeFilters } from "../../lib/filters.ts";
import { API_KEY, BASE, envelope, mockWufooCtx } from "../_helpers.ts";

Deno.test("normalizeSubdomain: reduces every plausible paste to the account name", () => {
  assertEquals(normalizeSubdomain("fishbowl"), "fishbowl");
  assertEquals(normalizeSubdomain("fishbowl.wufoo.com"), "fishbowl");
  assertEquals(normalizeSubdomain("https://fishbowl.wufoo.com/"), "fishbowl");
  assertEquals(normalizeSubdomain("  https://fishbowl.wufoo.com/forms/abc  "), "fishbowl");
  assertEquals(normalizeSubdomain("FISHBOWL"), "fishbowl");
});

/**
 * A bad subdomain would build a URL pointing at somebody else's account, or at
 * a host that is not Wufoo — so it is rejected rather than coerced.
 */
Deno.test("normalizeSubdomain: rejects anything that is not a subdomain", () => {
  assertThrows(() => normalizeSubdomain(""), Error, "empty");
  assertThrows(() => normalizeSubdomain("not a subdomain"), Error, "not a Wufoo subdomain");
  assertThrows(() => normalizeSubdomain("bad_underscore"), Error, "not a Wufoo subdomain");
});

Deno.test("baseUrlFor: builds the account's v3 base", () => {
  assertEquals(baseUrlFor("fishbowl"), BASE);
  assertEquals(baseUrlFor("https://fishbowl.wufoo.com"), BASE);
});

Deno.test("subdomainFromConnection: reads display, and says so when it is missing", () => {
  const { ctx } = mockWufooCtx();
  assertEquals(subdomainFromConnection(ctx.connection), "fishbowl");
  assertThrows(() => subdomainFromConnection(undefined), Error, "records no account subdomain");
});

Deno.test("API_KEY_PATTERN: four hyphenated groups of four, as the vendor documents", () => {
  assert(API_KEY_PATTERN.test(API_KEY));
  assert(!API_KEY_PATTERN.test("AOI6LFKLVM1QIEX9"), "unhyphenated must not match");
  assert(!API_KEY_PATTERN.test("AOI6-LFKL-VM1Q"), "three groups must not match");
});

/** The Basic-auth password is a documented placeholder, not a second secret. */
Deno.test("IGNORED_PASSWORD: is the vendor's documented placeholder", () => {
  assertEquals(IGNORED_PASSWORD, "footastic");
});

Deno.test("unwrap: peels the single-key collection envelope", () => {
  assertEquals(unwrap(envelope("Forms", [{ Hash: "h1" }]), "Forms"), [{ Hash: "h1" }]);
  assertEquals(unwrap(envelope("Entries", []), "Entries"), []);
});

/**
 * The entry-count endpoint answers `{"EntryCount": "42"}` — a value, not a
 * collection. Forcing it through the envelope would lose it.
 */
Deno.test("unwrap: leaves a non-envelope body unchanged", () => {
  assertEquals(unwrap({ EntryCount: "42" }, "Entries"), { EntryCount: "42" });
});

Deno.test("truncate: leaves short text alone and reports what it cut", () => {
  assertEquals(truncate("short", 10), "short");
  assert(truncate("x".repeat(50), 10).includes("50 bytes truncated"));
});

Deno.test("formatWufooError: surfaces the vendor's Text field", () => {
  const msg = formatWufooError(
    429,
    "POST",
    "/forms/x/entries.json",
    '{"Text":"Slow Down","HTTPCode":429}',
  );
  assert(msg.includes("429"), msg);
  assert(msg.includes("Slow Down"), msg);
});

/** Wufoo serves HTML for some failures, so a 401 gets a written explanation. */
Deno.test("formatWufooError: explains a 401 even when the body is HTML", () => {
  const msg = formatWufooError(401, "GET", "/forms.json", "<html>Unauthorized</html>");
  assert(msg.includes("401"), msg);
  assert(msg.includes("belongs to this account's subdomain"), msg);
});

Deno.test("client: builds against the connection's account subdomain", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Forms", []) }]);
  await new WufooClient(ctx).request("/forms.json");
  assertEquals(calls[0].url, `${BASE}/forms.json`);
});

Deno.test("client: drops empty query values instead of sending blanks", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: {} }]);
  await new WufooClient(ctx).request("/forms.json", {
    query: { a: undefined, b: null, c: "", d: 0, e: false },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), null);
  assertEquals(url.searchParams.get("c"), null);
  assertEquals(url.searchParams.get("d"), "0");
  assertEquals(url.searchParams.get("e"), "false");
});

/**
 * Entry submission is form-encoded, not JSON — the one call in the app whose
 * content-type is not application/json. Sending JSON here is rejected outright.
 */
Deno.test("client: a form body is url-encoded, not JSON", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: { Success: 1 } }]);
  await new WufooClient(ctx).request("/forms/x/entries.json", {
    method: "POST",
    form: { Field1: "Ada", Field2: "a b&c" },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "Field1=Ada&Field2=a+b%26c");
});

Deno.test("client: a non-2xx throws with Wufoo's own text", async () => {
  const { ctx } = mockWufooCtx([{ status: 429, body: { Text: "Slow Down", HTTPCode: 429 } }]);
  await assertRejects(
    async () => {
      await new WufooClient(ctx).request("/forms/x/entries.json", { method: "POST", form: {} });
    },
    Error,
    "Slow Down",
  );
});

/** The action worker must never see or build an Authorization header. */
Deno.test("client: never sets an authorization header — that is sign's job", async () => {
  const { ctx, calls } = mockWufooCtx([{ body: envelope("Forms", []) }]);
  await new WufooClient(ctx).request("/forms.json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("mergeFilters: numbers filters and builds the three-part value", () => {
  const query = mergeFilters({ match: "AND" }, [
    { field: "Field1", operator: "Is_equal_to", value: "Wufoo" },
    { field: "EntryId", operator: "Is_greater_than", value: 1 },
  ]);
  assertEquals(query.Filter1, "Field1 Is_equal_to Wufoo");
  assertEquals(query.Filter2, "EntryId Is_greater_than 1");
  assertEquals(query.match, "AND");
});

/**
 * A misspelt operator is not an error at Wufoo — it returns an empty result set,
 * which reads exactly like "no matching entries". Catching it here is the whole
 * point of validating against the closed list.
 */
Deno.test("mergeFilters: rejects an operator Wufoo does not publish", () => {
  assertThrows(
    () => mergeFilters({}, [{ field: "Field1", operator: "equals", value: "x" }]),
    Error,
    "unknown operator",
  );
  assertEquals(FILTER_OPERATORS.includes("Is_equal_to"), true);
});

Deno.test("mergeFilters: requires a value except for Is_not_NULL", () => {
  assertThrows(
    () => mergeFilters({}, [{ field: "Field1", operator: "Is_equal_to" }]),
    Error,
    "has no `value`",
  );
  const query = mergeFilters({}, [{ field: "Field1", operator: "Is_not_NULL" }]);
  assertEquals(query.Filter1, "Field1 Is_not_NULL");
});

Deno.test("mergeFilters: names a malformed filter entry by position", () => {
  assertThrows(
    () =>
      mergeFilters({}, [{ field: "Field1", operator: "Is_equal_to", value: "a" }, { field: "" }]),
    Error,
    "entry 2 has no `field`",
  );
  assertThrows(() => mergeFilters({}, { field: "x" }), Error, "must be an array");
});

Deno.test("mergeFilters: no filters leaves the query untouched", () => {
  assertEquals(mergeFilters({ pageSize: 10 }, undefined), { pageSize: 10 });
});
