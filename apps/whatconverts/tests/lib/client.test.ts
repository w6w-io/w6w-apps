import { assertEquals, assertRejects } from "@std/assert";
import {
  asOptionalJson,
  boolParam,
  compact,
  encodeBase64,
  formatWhatConvertsError,
  WhatConvertsClient,
} from "../../lib/client.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("compact drops undefined/null/empty but keeps false and 0", () => {
  const out = compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" });
  assertEquals(out, { d: false, e: 0, f: "x" });
});

Deno.test("boolParam renders literal true/false strings, drops undefined", () => {
  assertEquals(boolParam(true), "true");
  assertEquals(boolParam(false), "false");
  assertEquals(boolParam(undefined), undefined);
});

Deno.test("asOptionalJson passes through an object and parses a JSON string", () => {
  assertEquals(asOptionalJson({ a: 1 }, "field"), { a: 1 });
  assertEquals(asOptionalJson('{"a":1}', "field"), { a: 1 });
  assertEquals(asOptionalJson(undefined, "field"), undefined);
  assertEquals(asOptionalJson("", "field"), undefined);
});

Deno.test("asOptionalJson throws a labeled error on invalid JSON", () => {
  try {
    asOptionalJson("{not json", "myField");
    throw new Error("expected throw");
  } catch (e) {
    assertEquals((e as Error).message, "myField is not valid JSON");
  }
});

Deno.test("formatWhatConvertsError surfaces the vendor's error_message verbatim", () => {
  const msg = formatWhatConvertsError(
    401,
    "GET",
    "/api/v1/leads",
    JSON.stringify({ error_message: "Authentication failed." }),
    "application/json; charset=utf-8",
  );
  assertEquals(msg, "WhatConverts 401 for GET /api/v1/leads: Authentication failed.");
});

Deno.test("formatWhatConvertsError falls back to raw text for a non-JSON body", () => {
  const msg = formatWhatConvertsError(
    404,
    "GET",
    "/api/v1/bogus",
    "<html>Oops! That page couldn't be found.</html>",
    "text/html; charset=UTF-8",
  );
  assertEquals(
    msg,
    "WhatConverts 404 for GET /api/v1/bogus: <html>Oops! That page couldn't be found.</html>",
  );
});

Deno.test("WhatConvertsClient.get sends query params and parses JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leads: [] } }]);
  const client = new WhatConvertsClient(ctx);
  const out = await client.get<{ leads: unknown[] }>("/leads", { leads_per_page: 5 });
  assertEquals(out, { leads: [] });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/leads?leads_per_page=5`);
});

Deno.test("WhatConvertsClient.get drops empty/undefined query values", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const client = new WhatConvertsClient(ctx);
  await client.get("/leads", { account_id: undefined, profile_id: "" });
  assertEquals(calls[0].url, `${API_ROOT}/leads`);
});

Deno.test("WhatConvertsClient.post sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 1 } }]);
  const client = new WhatConvertsClient(ctx);
  const out = await client.post("/leads", { lead_type: "phone_call" });
  assertEquals(out, { lead_id: 1 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ lead_type: "phone_call" }));
});

Deno.test("WhatConvertsClient.delete sends no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: 1 } }]);
  const client = new WhatConvertsClient(ctx);
  const out = await client.delete("/accounts/1");
  assertEquals(out, { account_id: 1 });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("WhatConvertsClient throws a formatted error on a JSON error response", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error_message: "Authentication failed." },
  }]);
  const client = new WhatConvertsClient(ctx);
  await assertRejects(
    () => client.get("/leads"),
    Error,
    "WhatConverts 401 for GET /api/v1/leads: Authentication failed.",
  );
});

Deno.test("WhatConvertsClient.raw returns bytes and content type, throws on failure", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const { ctx, calls } = mockCtx([
    { status: 200, body: bytes, headers: { "content-type": "audio/mpeg" } },
  ]);
  const client = new WhatConvertsClient(ctx);
  const result = await client.raw("/recording", { lead_id: 42 });
  assertEquals(result.status, 200);
  assertEquals(result.contentType, "audio/mpeg");
  assertEquals(Array.from(result.bytes), [1, 2, 3, 4]);
  assertEquals(calls[0].url, `${API_ROOT}/recording?lead_id=42`);
});

Deno.test("WhatConvertsClient.raw throws on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error_message: "Lead not found." } }]);
  const client = new WhatConvertsClient(ctx);
  await assertRejects(() => client.raw("/recording", { lead_id: 1 }), Error, "Lead not found.");
});

Deno.test("encodeBase64 round-trips arbitrary bytes", () => {
  const bytes = new Uint8Array([0, 255, 16, 32, 200]);
  const encoded = encodeBase64(bytes);
  const decoded = atob(encoded);
  const roundTripped = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  assertEquals(Array.from(roundTripped), Array.from(bytes));
});
