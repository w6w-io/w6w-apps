import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  buildListQuery,
  compact,
  cursorFromUrl,
  dateFilter,
  encodeId,
  formatHarvestError,
  HarvestClient,
  idList,
  parseNextLink,
  readRateLimit,
  truncate,
} from "../../lib/client.ts";
import { errorBody, listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string but keeps false and zero", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

/**
 * The vendor's own worked example is `created_at=gte|2024-01-01T00:00:00Z`. It
 * is not `created_at[gte]=`, not `created_at_after=`, and not a bare timestamp.
 */
Deno.test("dateFilter: renders the pipe-delimited operator form", () => {
  assertEquals(dateFilter("gte", "2024-01-01T00:00:00Z"), "gte|2024-01-01T00:00:00Z");
});

Deno.test("dateFilter: a half-filled pair is dropped rather than guessed at", () => {
  assertEquals(dateFilter("gte", ""), undefined);
  assertEquals(dateFilter("", "2024-01-01T00:00:00Z"), undefined);
  assertEquals(dateFilter(undefined, undefined), undefined);
});

Deno.test("idList: joins to the explode:false comma form and tolerates whitespace", () => {
  assertEquals(idList("1, 2 ,3", "ids"), "1,2,3");
  assertEquals(idList([4, 5], "ids"), "4,5");
  assertEquals(idList("", "ids"), undefined);
});

/** Greenhouse documents a 50-item ceiling; failing locally saves a 422 round trip. */
Deno.test("idList: refuses more than the documented 50 ids, naming the field", () => {
  const tooMany = Array.from({ length: 51 }, (_, i) => i + 1).join(",");
  const err = assertThrows(() => idList(tooMany, "candidateIds"), Error);
  assert(err.message.includes("candidateIds"), err.message);
  assert(err.message.includes("50"), err.message);
  // Exactly 50 is fine — the boundary is inclusive.
  assertEquals(idList(Array.from({ length: 50 }, (_, i) => i + 1), "ids")?.split(",").length, 50);
});

/**
 * The whole point of `buildListQuery`. Greenhouse answers 422 for a cursor sent
 * with anything else, and the message has to name what to clear.
 */
Deno.test("buildListQuery: a cursor travels alone, and everything else is rejected by name", () => {
  assertEquals(buildListQuery("abc", {}), { cursor: "abc" });

  const err = assertThrows(
    () => buildListQuery("abc", { per_page: 50, status: "active" }),
    Error,
  );
  assert(err.message.includes("per_page"), err.message);
  assert(err.message.includes("status"), err.message);
  assert(err.message.includes("422"), err.message);
});

Deno.test("buildListQuery: an empty cursor is not a cursor", () => {
  assertEquals(buildListQuery("   ", { per_page: 50 }), { per_page: 50 });
  assertEquals(buildListQuery(undefined, { per_page: 50 }), { per_page: 50 });
});

Deno.test("parseNextLink: reads rel=next, ignores other relations, tolerates absence", () => {
  assertEquals(
    parseNextLink('<https://harvest.greenhouse.io/v3/jobs?cursor=abc>; rel="next"'),
    "https://harvest.greenhouse.io/v3/jobs?cursor=abc",
  );
  assertEquals(
    parseNextLink('<https://x/prev>; rel="prev", <https://x/next>; rel="next"'),
    "https://x/next",
  );
  assertEquals(parseNextLink('<https://x/last>; rel="last"'), undefined);
  assertEquals(parseNextLink(null), undefined);
});

Deno.test("cursorFromUrl: lifts the opaque cursor out, and survives a malformed URL", () => {
  assertEquals(
    cursorFromUrl("https://harvest.greenhouse.io/v3/jobs?cursor=eyJ4IjoxfQ"),
    "eyJ4IjoxfQ",
  );
  assertEquals(cursorFromUrl("https://harvest.greenhouse.io/v3/jobs"), undefined);
  assertEquals(cursorFromUrl("not a url"), undefined);
  assertEquals(cursorFromUrl(undefined), undefined);
});

Deno.test("readRateLimit: reads the documented triple and ignores unparseable values", () => {
  const headers = new Headers({
    "x-ratelimit-limit": "75",
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": "1786425600",
    "retry-after": "12",
  });
  assertEquals(readRateLimit(headers), {
    limit: 75,
    remaining: 0,
    resetAt: 1786425600,
    retryAfter: 12,
  });
  assertEquals(readRateLimit(new Headers({ "x-ratelimit-limit": "lots" })).limit, undefined);
});

Deno.test("encodeId: a slash pasted into an id cannot escape its path segment", () => {
  assertEquals(encodeId("1/../users"), "1%2F..%2Fusers");
  assertEquals(encodeId(42), "42");
});

Deno.test("truncate: leaves short text alone and marks what it cut", () => {
  assertEquals(truncate("short", 100), "short");
  assert(truncate("x".repeat(50), 10).includes("truncated"));
});

/** Both `errors` shapes appear in Greenhouse's own examples on one doc page. */
Deno.test("formatHarvestError: flattens the string-array errors shape", () => {
  const message = formatHarvestError(
    422,
    "GET",
    "/v3/jobs",
    JSON.stringify(errorBody("Unprocessable Content", [
      "When passing a cursor, do not include other query params.",
    ])),
  );
  assert(message.includes("Unprocessable Content"), message);
  assert(message.includes("do not include other query params"), message);
});

Deno.test("formatHarvestError: flattens the object-array errors shape with its field name", () => {
  const message = formatHarvestError(
    422,
    "GET",
    "/v3/jobs",
    JSON.stringify(errorBody("Unprocessable Content", [
      { per_page: "`600` number is greater than: 500" },
    ])),
  );
  assert(message.includes("per_page: `600` number is greater than: 500"), message);
});

/**
 * A 403 is the one status where the message has to explain itself: it means the
 * credential is fine and the grant is not, and every v3 GET additionally needs a
 * Site Admin subject.
 */
Deno.test("formatHarvestError: a 403 explains that the credential is not the problem", () => {
  const message = formatHarvestError(
    403,
    "GET",
    "/v3/candidates",
    JSON.stringify(
      errorBody("Forbidden"),
    ),
  );
  assert(message.includes("credential is valid"), message);
  assert(message.includes("Site Admin"), message);
});

Deno.test("formatHarvestError: a 429 carries the Retry-After value, which the body never does", () => {
  const message = formatHarvestError(429, "GET", "/v3/jobs", "{}", 12);
  assert(message.includes("retry after 12 seconds"), message);
});

Deno.test("formatHarvestError: a non-JSON body still produces a usable line", () => {
  const message = formatHarvestError(502, "GET", "/v3/jobs", "<html>bad gateway</html>");
  assert(message.includes("502"), message);
  assert(message.includes("bad gateway"), message);
});

Deno.test("HarvestClient.list: returns the bare array plus the header-borne cursor", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 2 }, { id: 1 }], "CURSOR2")]);
  const page = await new HarvestClient(ctx).list("/candidates", { query: { per_page: 2 } });

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/candidates");
  assertEquals(queryOf(calls[0].url), { per_page: "2" });
  assertEquals(page.items.length, 2);
  assertEquals(page.nextCursor, "CURSOR2");
  assertEquals(page.hasMore, true);
  assertEquals(page.rateLimit.limit, 75);
});

Deno.test("HarvestClient.list: no Link header means the last page", async () => {
  const { ctx } = mockCtx([listPage([{ id: 1 }])]);
  const page = await new HarvestClient(ctx).list("/candidates");
  assertEquals(page.nextCursor, undefined);
  assertEquals(page.hasMore, false);
});

/**
 * The Action never sets a credential — the runtime routes the request through
 * the `sign` hook. A client that stamped one would be a credential leak into the
 * action sandbox.
 */
Deno.test("HarvestClient: an action request carries no credential of any kind", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await new HarvestClient(ctx).list("/candidates");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(Object.keys(calls[0].headers).sort(), ["accept"]);
});

Deno.test("HarvestClient.status: a 204 lifecycle call reports its status and parses no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const status = await new HarvestClient(ctx).status("/applications/1/hire", {
    method: "POST",
    body: {},
  });
  assertEquals(status, 204);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("HarvestClient: a failure throws with the vendor's own message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Resource not found") }]);
  let caught: Error | undefined;
  try {
    await new HarvestClient(ctx).list("/nope");
  } catch (error) {
    caught = error as Error;
  }
  assert(caught, "expected a throw");
  assert(caught!.message.includes("Resource not found"), caught!.message);
  assert(caught!.message.includes("/v3/nope"), caught!.message);
});
