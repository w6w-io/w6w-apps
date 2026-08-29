import { assertEquals, assertRejects } from "@std/assert";
import { compact, formatHunterError, HunterClient, truncate } from "../../lib/client.ts";
import { envelope, errorBody, mockCtx, pathOf, queryAllOf, queryOf } from "../_helpers.ts";

Deno.test("compact: drops undefined, null and empty string; keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("truncate: passes short text through, truncates long text with a byte count", () => {
  assertEquals(truncate("short"), "short");
  const long = "x".repeat(600);
  const out = truncate(long, 500);
  assertEquals(out.startsWith("x".repeat(500)), true);
  assertEquals(out.includes("600 bytes truncated"), true);
});

Deno.test("formatHunterError: surfaces the errors[].id and details, not just the status", () => {
  const raw = JSON.stringify(errorBody("invalid_domain", 400, "no MX record"));
  const msg = formatHunterError(400, "GET", "/v2/email-finder", raw);
  assertEquals(msg.includes("invalid_domain"), true);
  assertEquals(msg.includes("no MX record"), true);
});

Deno.test("formatHunterError: falls back to the raw body when it isn't the errors[] shape", () => {
  const msg = formatHunterError(500, "GET", "/v2/account", "internal error");
  assertEquals(msg.includes("internal error"), true);
  assertEquals(msg.includes("500"), true);
});

Deno.test("HunterClient.request: GETs with query params and returns the envelope verbatim", async () => {
  const body = envelope({ domain: "stripe.com" }, { results: 1 });
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await new HunterClient(ctx).request("/domain-search", {
    query: { domain: "stripe.com", limit: 10 },
  });
  assertEquals(pathOf(calls[0].url), "/v2/domain-search");
  assertEquals(queryOf(calls[0].url).domain, "stripe.com");
  assertEquals(queryOf(calls[0].url).limit, "10");
  assertEquals(result, body);
});

Deno.test("HunterClient.request: drops undefined/null/empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new HunterClient(ctx).request("/domain-search", {
    query: { domain: "stripe.com", company: undefined, type: "" },
  });
  const q = queryOf(calls[0].url);
  assertEquals("company" in q, false);
  assertEquals("type" in q, false);
});

Deno.test("HunterClient.request: appends bracket-array query params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await new HunterClient(ctx).request("/leads", {
    arrayQuery: { verification_status: ["valid", "unknown"] },
  });
  assertEquals(queryAllOf(calls[0].url, "verification_status[]"), ["valid", "unknown"]);
});

Deno.test("HunterClient.request: sends a JSON body with content-type on POST/PUT", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: 1 }) }]);
  await new HunterClient(ctx).request("/leads", {
    method: "POST",
    body: { email: "a@b.com" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ email: "a@b.com" }));
});

Deno.test("HunterClient.request: a 204 response returns an envelope with undefined data", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const result = await new HunterClient(ctx).request("/leads/1", { method: "DELETE" });
  assertEquals(result, { data: undefined });
});

Deno.test("HunterClient.request: throws a formatted error on a non-2xx status", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody("wrong_params", 400, "domain is missing") },
  ]);
  await assertRejects(
    () => new HunterClient(ctx).request("/domain-search"),
    Error,
    "wrong_params",
  );
});

Deno.test("HunterClient.raw: exposes the status so 202/222 can be told apart from 200", async () => {
  const { ctx } = mockCtx([{ status: 202, body: envelope({ status: null }) }]);
  const { status, body } = await new HunterClient(ctx).raw("/email-verifier", {
    query: { email: "a@b.com" },
  });
  assertEquals(status, 202);
  assertEquals(body?.data, { status: null });
});

Deno.test("HunterClient.raw: does not throw on a non-2xx — request() is the throwing form", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { errors: [{ id: "not_found" }] } }]);
  const { status } = await new HunterClient(ctx).raw("/people/find", {
    query: { email: "nobody@example.com" },
  });
  assertEquals(status, 404);
});
