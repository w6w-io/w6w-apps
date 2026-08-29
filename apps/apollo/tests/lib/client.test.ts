import { assertEquals, assertRejects } from "@std/assert";
import {
  ApolloClient,
  appendQuery,
  appendRange,
  compact,
  formatApolloError,
  toList,
} from "../../lib/client.ts";
import { mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("toList: splits a comma string and trims", () => {
  assertEquals(toList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toList(["x", "y"]), ["x", "y"]);
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(""), undefined);
});

Deno.test("appendQuery: an array becomes repeated key[] entries", () => {
  const usp = new URLSearchParams();
  appendQuery(usp, "person_titles", ["CEO", "CTO"]);
  assertEquals(usp.getAll("person_titles[]"), ["CEO", "CTO"]);
});

Deno.test("appendQuery: a scalar is sent plain, with no bracket suffix", () => {
  const usp = new URLSearchParams();
  appendQuery(usp, "q_keywords", "apollo");
  assertEquals(usp.get("q_keywords"), "apollo");
  assertEquals(usp.has("q_keywords[]"), false);
});

Deno.test("appendQuery: undefined, null and empty string are dropped, not stringified", () => {
  const usp = new URLSearchParams();
  appendQuery(usp, "a", undefined);
  appendQuery(usp, "b", null);
  appendQuery(usp, "c", "");
  assertEquals(usp.toString(), "");
});

Deno.test("appendQuery: false and 0 survive — both are meaningful values", () => {
  const usp = new URLSearchParams();
  appendQuery(usp, "sort_ascending", false);
  appendQuery(usp, "page", 0);
  assertEquals(usp.get("sort_ascending"), "false");
  assertEquals(usp.get("page"), "0");
});

Deno.test("appendRange: emits key[min] and key[max]", () => {
  const usp = new URLSearchParams();
  appendRange(usp, "revenue_range", { min: 100, max: 200 });
  assertEquals(usp.get("revenue_range[min]"), "100");
  assertEquals(usp.get("revenue_range[max]"), "200");
});

Deno.test("appendRange: a one-sided range only emits the side that's set", () => {
  const usp = new URLSearchParams();
  appendRange(usp, "revenue_range", { min: 100 });
  assertEquals(usp.get("revenue_range[min]"), "100");
  assertEquals(usp.has("revenue_range[max]"), false);
});

Deno.test("appendRange: undefined range emits nothing", () => {
  const usp = new URLSearchParams();
  appendRange(usp, "revenue_range", undefined);
  assertEquals(usp.toString(), "");
});

// --- formatApolloError: the three documented shapes -------------------------

Deno.test("formatApolloError: a 422 JSON {error} body surfaces the message", () => {
  const msg = formatApolloError(
    422,
    "POST",
    "/contacts",
    "application/json",
    JSON.stringify({ error: "Parameters misconfigured. abc is not a valid ID" }),
  );
  assertEquals(msg.includes("422"), true);
  assertEquals(msg.includes("Parameters misconfigured"), true);
});

Deno.test("formatApolloError: a 429 JSON {message} body surfaces the message", () => {
  const msg = formatApolloError(
    429,
    "POST",
    "/contacts",
    "application/json",
    JSON.stringify({ message: "The maximum number of api calls allowed is 600 times per hour." }),
  );
  assertEquals(msg.includes("429"), true);
  assertEquals(msg.includes("maximum number of api calls"), true);
});

Deno.test("formatApolloError: a 401 plain-text body (no JSON at all) is used verbatim", () => {
  const msg = formatApolloError(
    401,
    "GET",
    "/users/api_profile",
    "text/plain",
    "Invalid API key. See https://docs.apollo.io/reference/authentication for how to authenticate.",
  );
  assertEquals(msg.includes("401"), true);
  assertEquals(msg.includes("Invalid API key"), true);
});

Deno.test("formatApolloError: a body with neither error nor message still keeps the raw text", () => {
  const msg = formatApolloError(
    500,
    "GET",
    "/x",
    "application/json",
    JSON.stringify({ oops: true }),
  );
  assertEquals(msg.includes("500"), true);
  assertEquals(msg.includes("oops"), true);
});

Deno.test("formatApolloError: an empty body produces a bare status line, not a trailing colon", () => {
  const msg = formatApolloError(500, "GET", "/x", "text/plain", "");
  assertEquals(msg, "Apollo 500 for GET /x");
});

// --- ApolloClient ------------------------------------------------------------

Deno.test("ApolloClient.get: hits the right host, path and query, with no auth header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { account: { id: "a1" } } }]);
  const body = await new ApolloClient(ctx).get<{ account: { id: string } }>("/accounts/a1", {
    include_credit_usage: true,
  });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith(`${"https://api.apollo.io/api/v1"}/accounts/a1?`), true);
  assertEquals(queryOf(calls[0].url).include_credit_usage, "true");
  assertEquals(body.account.id, "a1");
  // The client never sets an auth header — that is `sign`'s job alone.
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("ApolloClient.post: JSON-encodes the body with the right content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact: { id: "c1" } } }]);
  await new ApolloClient(ctx).post("/contacts", { body: { first_name: "Ada" } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { first_name: "Ada" });
});

Deno.test("ApolloClient.post: query and body can both be set on the same request", async () => {
  const { ctx, calls } = mockCtx([{ body: { matches: [] } }]);
  await new ApolloClient(ctx).post("/people/bulk_match", {
    query: { reveal_phone_number: true },
    body: { details: [{ email: "a@b.com" }] },
  });
  assertEquals(queryOf(calls[0].url).reveal_phone_number, "true");
  assertEquals(JSON.parse(calls[0].body!), { details: [{ email: "a@b.com" }] });
});

Deno.test("ApolloClient: an array query value is sent bracket-form across multiple entries", async () => {
  const { ctx, calls } = mockCtx([{ body: { people: [] } }]);
  await new ApolloClient(ctx).post("/mixed_people/api_search", {
    query: { person_titles: ["CEO", "CTO"] },
  });
  assertEquals(queryAllOf(calls[0].url, "person_titles[]"), ["CEO", "CTO"]);
});

Deno.test("ApolloClient: a non-ok response rejects with the formatted error", async () => {
  const { ctx } = mockCtx([
    { status: 422, body: { error: "Api key required" } },
  ]);
  const err = await assertRejects(() => new ApolloClient(ctx).get("/users/api_profile"), Error);
  assertEquals(err.message.includes("Api key required"), true, err.message);
});

Deno.test("ApolloClient: a 204 response resolves to undefined, not a JSON parse error", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await new ApolloClient(ctx).request("/labels/x", { method: "DELETE" });
  assertEquals(result, undefined);
  assertEquals(pathOf(calls[0].url), "/api/v1/labels/x");
});
