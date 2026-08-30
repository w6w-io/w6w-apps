import { assertEquals } from "@std/assert";
import { formatQuoError, parseRateLimit, QuoClient } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("formatQuoError: parses the actually-observed {error:{message,key}} envelope", () => {
  const raw = JSON.stringify(errorBody("Missing authorization header"));
  const msg = formatQuoError(401, "GET", "/v1/phone-numbers", raw);
  assertEquals(msg.includes("401"), true);
  assertEquals(msg.includes("Missing authorization header"), true);
});

Deno.test("formatQuoError: prefixes the vendor `key` only when it differs from the message", () => {
  const raw = JSON.stringify(errorBody("Unauthorized", "Unauthorized"));
  const msg = formatQuoError(401, "GET", "/v1/phone-numbers", raw);
  // key === message here, so it should not be duplicated as "Unauthorized: Unauthorized".
  assertEquals(msg.includes("Unauthorized: Unauthorized"), false);
  assertEquals(msg.includes("Unauthorized"), true);
});

Deno.test("formatQuoError: falls back to the raw body for a non-JSON response (unmatched route)", () => {
  const raw = "<!DOCTYPE html><pre>Cannot GET /v1/does-not-exist</pre>";
  const msg = formatQuoError(404, "GET", "/v1/does-not-exist", raw);
  assertEquals(msg.includes("404"), true);
  assertEquals(msg.includes("Cannot GET"), true);
});

Deno.test("formatQuoError: notes the 10 req/s ceiling on 429", () => {
  const msg = formatQuoError(429, "POST", "/v1/messages", "");
  assertEquals(msg.includes("10 requests/second"), true);
});

Deno.test("parseRateLimit: reads r/t from `ratelimit` and q/w from `ratelimit-policy`", () => {
  const out = parseRateLimit('"per-second"; r=9; t=1', '"per-second"; q=10; w=1');
  assertEquals(out.remaining, 9);
  assertEquals(out.resetsIn, 1);
  assertEquals(out.quota, 10);
  assertEquals(out.window, 1);
});

Deno.test("parseRateLimit: returns an empty object when headers are absent", () => {
  const out = parseRateLimit(null, null);
  assertEquals(out.remaining, undefined);
  assertEquals(out.quota, undefined);
});

Deno.test("QuoClient: GET builds the /v1-prefixed URL and repeats array query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new QuoClient(ctx).json("/messages", {
    query: { phoneNumberId: "PN1", participants: ["+15555555555", "+15555555556"] },
  });
  assertEquals(pathOf(calls[0].url), "/v1/messages");
  assertEquals(queryOf(calls[0].url).phoneNumberId, "PN1");
  assertEquals(queryAllOf(calls[0].url, "participants"), ["+15555555555", "+15555555556"]);
});

Deno.test("QuoClient: omits undefined/null/empty query values entirely", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new QuoClient(ctx).json("/users", { query: { maxResults: undefined, pageToken: "" } });
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("QuoClient: POST sends a JSON content-type header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { data: { id: "AC1" } } }]);
  await new QuoClient(ctx).json("/messages", {
    method: "POST",
    body: { content: "hi", from: "PN1", to: ["+15555555555"] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!).content, "hi");
});

Deno.test("QuoClient: returns undefined for an empty 204 body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const out = await new QuoClient(ctx).json("/contacts/c1", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("QuoClient: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  await new QuoClient(ctx).json("/phone-numbers").then(
    () => {
      throw new Error("expected a rejection");
    },
    (err) => {
      assertEquals(String(err).includes("401"), true);
      assertEquals(String(err).includes("Unauthorized"), true);
    },
  );
});
