import { assertEquals, assertRejects } from "@std/assert";
import { asJson, asOptionalJson, BlandClient, compact, parseBlandError } from "../../lib/client.ts";
import { legacyErrorBody, mockCtx, newErrorBody } from "../_helpers.ts";

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("asOptionalJson: parses a JSON string, passes through a non-string, undefined stays undefined", () => {
  assertEquals(asOptionalJson('{"a":1}', "x"), { a: 1 });
  assertEquals(asOptionalJson({ a: 1 }, "x"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "x"), undefined);
  assertEquals(asOptionalJson("", "x"), undefined);
});

Deno.test("asOptionalJson: throws with the field label on invalid JSON", () => {
  let threw = false;
  try {
    asOptionalJson("{not json", "widgets");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "widgets is not valid JSON");
  }
  assertEquals(threw, true);
});

Deno.test("asJson: requires a value", () => {
  let threw = false;
  try {
    asJson(undefined, "questions");
  } catch (e) {
    threw = true;
    assertEquals((e as Error).message, "questions is required");
  }
  assertEquals(threw, true);
});

Deno.test("parseBlandError: the new `{data, errors}` envelope", () => {
  const raw = JSON.stringify(newErrorBody("AUTH_FAILURE", "Unauthorized"));
  const msg = parseBlandError(401, "GET", "/v1/me", raw);
  assertEquals(msg, "Bland 401 AUTH_FAILURE for GET /v1/me: Unauthorized");
});

Deno.test("parseBlandError: the legacy `{status, message}` envelope", () => {
  const raw = JSON.stringify(legacyErrorBody("Rate limit exceeded"));
  const msg = parseBlandError(429, "POST", "/v1/calls", raw);
  assertEquals(msg, "Bland 429 for POST /v1/calls: Rate limit exceeded");
});

Deno.test("parseBlandError: the legacy envelope with a field-errors array", () => {
  const raw = JSON.stringify(
    legacyErrorBody("Invalid parameters", ["Missing required parameter: phone_number."]),
  );
  const msg = parseBlandError(400, "POST", "/v1/calls", raw);
  assertEquals(
    msg,
    "Bland 400 for POST /v1/calls: Invalid parameters (Missing required parameter: phone_number.)",
  );
});

Deno.test("parseBlandError: unparseable body falls back to a truncated raw dump", () => {
  const msg = parseBlandError(500, "GET", "/v1/calls", "<html>gateway error</html>");
  assertEquals(msg, "Bland 500 for GET /v1/calls: <html>gateway error</html>");
});

Deno.test("parseBlandError: empty body", () => {
  assertEquals(parseBlandError(502, "GET", "/v1/calls", ""), "Bland 502 for GET /v1/calls");
});

Deno.test("BlandClient.request: builds the URL, sends query params, parses JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 2 } }]);
  const client = new BlandClient(ctx);
  const out = await client.request<{ count: number }>("/v1/calls", { query: { limit: 5 } });
  assertEquals(out.count, 2);
  assertEquals(calls[0].url, "https://api.bland.ai/v1/calls?limit=5");
  assertEquals(calls[0].method, "GET");
});

Deno.test("BlandClient.request: omits empty/undefined/null query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const client = new BlandClient(ctx);
  await client.request("/v1/calls", { query: { a: undefined, b: null, c: "", d: "kept" } });
  assertEquals(calls[0].url, "https://api.bland.ai/v1/calls?d=kept");
});

Deno.test("BlandClient.request: JSON-encodes a body with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success" } }]);
  const client = new BlandClient(ctx);
  await client.request("/v1/calls", { method: "POST", body: { phone_number: "+1" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ phone_number: "+1" }));
});

Deno.test("BlandClient.request: throws a formatted error on a non-ok response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: newErrorBody("AUTH_FAILURE", "Unauthorized") }]);
  const client = new BlandClient(ctx);
  await assertRejects(
    () => client.request("/v1/me"),
    Error,
    "Bland 401 AUTH_FAILURE for GET /v1/me: Unauthorized",
  );
});

Deno.test("BlandClient.request: an empty ok body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const client = new BlandClient(ctx);
  const out = await client.request("/v1/pathway/abc/version/1");
  assertEquals(out, undefined);
});

Deno.test("BlandClient.data: unwraps the `{data, errors}` envelope", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: { message: "ok" }, errors: null } }]);
  const client = new BlandClient(ctx);
  const out = await client.data<{ message: string }>("/v1/calls/active/transfer", {
    method: "POST",
  });
  assertEquals(out.message, "ok");
});

Deno.test("BlandClient.request: merges custom headers alongside accept", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  const client = new BlandClient(ctx);
  await client.request("/v1/calls/active", { headers: { "x-bland-org-id": "org_123" } });
  assertEquals(calls[0].headers["x-bland-org-id"], "org_123");
  assertEquals(calls[0].headers["accept"], "application/json");
});
