import { assertEquals, assertThrows } from "@std/assert";
import {
  compact,
  formatDevinError,
  orgIdFromConnection,
  toList,
  toSearchResult,
} from "../../lib/client.ts";
import type { RedactedConnection } from "@w6w/types";

Deno.test("orgIdFromConnection: reads orgId off the connection's display data", () => {
  const connection = { display: { orgId: "org-abc123" } } as unknown as RedactedConnection;
  assertEquals(orgIdFromConnection(connection), "org-abc123");
});

Deno.test("orgIdFromConnection: throws a helpful error when absent", () => {
  assertThrows(() => orgIdFromConnection(undefined), Error, "reconnect");
  assertThrows(
    () => orgIdFromConnection({ display: {} } as unknown as RedactedConnection),
    Error,
    "reconnect",
  );
});

Deno.test("compact: drops undefined, null and empty string; keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "keep" }),
    { d: false, e: 0, f: "keep" },
  );
});

Deno.test("toList: splits a comma-separated string and trims whitespace", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
});

Deno.test("toList: passes an array through, dropping blanks", () => {
  assertEquals(toList(["a", "", " b "]), ["a", "b"]);
});

Deno.test("toList: returns undefined for empty input", () => {
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
  assertEquals(toList([]), undefined);
});

Deno.test("toSearchResult: carries end_cursor forward only when has_next_page is true", () => {
  assertEquals(
    toSearchResult({ items: [1], end_cursor: "abc", has_next_page: true, total: 5 }),
    { items: [1], nextCursor: "abc" },
  );
  assertEquals(
    toSearchResult({ items: [1], end_cursor: "abc", has_next_page: false, total: 1 }),
    { items: [1], nextCursor: undefined },
  );
});

Deno.test("formatDevinError: surfaces the RFC 9457 title and detail", () => {
  const raw = JSON.stringify({
    type: "about:blank",
    title: "Forbidden",
    status: 403,
    detail: "Unauthorized",
    instance: "/v3/self",
  });
  const message = formatDevinError(403, "GET", "/v3/self", raw);
  assertEquals(message, "Devin 403 Forbidden for GET /v3/self: Unauthorized");
});

Deno.test("formatDevinError: includes field errors from a 422", () => {
  const raw = JSON.stringify({
    title: "Unprocessable Entity",
    detail: "Validation failed",
    errors: [{ loc: ["body", "prompt"], msg: "field required" }],
  });
  const message = formatDevinError(422, "POST", "/v3/organizations/org-x/sessions", raw);
  assertEquals(message.includes("field errors:"), true);
  assertEquals(message.includes("field required"), true);
});

Deno.test("formatDevinError: falls back to the raw body when it isn't the problem shape", () => {
  const message = formatDevinError(500, "GET", "/v3/self", "upstream exploded");
  assertEquals(message, "Devin 500 for GET /v3/self: upstream exploded");
});
