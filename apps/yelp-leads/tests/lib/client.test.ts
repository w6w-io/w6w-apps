import { assertEquals, assertRejects } from "@std/assert";
import {
  compactQuery,
  encodeBusinessId,
  encodeLeadId,
  formatYelpError,
  yelpRequest,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryOf, yelpError } from "../_helpers.ts";

Deno.test("formatYelpError: renders code + description", () => {
  assertEquals(
    formatYelpError(400, {
      error: { code: "INVALID_ID", description: "The ID provided is not valid." },
    }),
    "INVALID_ID: The ID provided is not valid.",
  );
});

Deno.test("formatYelpError: includes the field when present", () => {
  assertEquals(
    formatYelpError(400, {
      error: { code: "VALIDATION_ERROR", description: "missing", field: "request_content" },
    }),
    "VALIDATION_ERROR: missing (field: request_content)",
  );
});

Deno.test("formatYelpError: falls back to the bare status for an unrecognised body", () => {
  assertEquals(formatYelpError(502, null), "Yelp returned HTTP 502");
  assertEquals(formatYelpError(502, { unexpected: true }), "Yelp returned HTTP 502");
});

Deno.test("compactQuery: drops undefined/null/empty, keeps false and 0", () => {
  assertEquals(
    compactQuery({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: "false", e: "0", f: "x" },
  );
});

Deno.test("encodeLeadId / encodeBusinessId: trim and path-escape", () => {
  assertEquals(encodeLeadId(" ab/cd "), "ab%2Fcd");
  assertEquals(encodeBusinessId("a b"), "a%20b");
});

Deno.test("yelpRequest: builds the URL, sends accept, and returns parsed JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "abc123" } }]);
  const result = await yelpRequest(ctx, "/leads/abc123", { query: { limit: 5, skip: undefined } });

  assertEquals(result, { id: "abc123" });
  assertEquals(pathOf(calls[0].url), "/v3/leads/abc123");
  assertEquals(queryOf(calls[0].url), { limit: "5" });
  assertEquals(calls[0].headers.accept, "application/json");
  assertEquals(calls[0].method, "GET");
});

Deno.test("yelpRequest: POSTs a JSON body with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await yelpRequest(ctx, "/leads/abc/events", {
    method: "POST",
    body: { request_content: "hi", request_type: "TEXT" },
  });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { request_content: "hi", request_type: "TEXT" });
});

Deno.test("yelpRequest: throws Yelp's own diagnosis on a non-2xx response", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: yelpError("NOT_FOUND", "Resource could not be found") },
  ]);
  await assertRejects(
    () => yelpRequest(ctx, "/leads/missing"),
    Error,
    "NOT_FOUND: Resource could not be found",
  );
});

Deno.test("yelpRequest: an empty 201 body parses as null rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 201, body: "" }]);
  const result = await yelpRequest(ctx, "/leads/abc/mark_as_replied", {
    method: "POST",
    body: { reply_type: "PHONE" },
  });
  assertEquals(result, null);
});
