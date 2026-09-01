import { assert, assertEquals, assertRejects } from "@std/assert";
import { AirtopClient, API_BASE, compact, csv, formatAirtopError } from "../../lib/client.ts";
import { aiEnvelope, envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("client: API_BASE is the OpenAPI document's one declared server", () => {
  assertEquals(API_BASE, "https://api.airtop.ai/api");
});

Deno.test("compact: drops undefined/null/empty-string, keeps false and 0", () => {
  assertEquals(compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }), {
    d: false,
    e: 0,
    f: "x",
  });
});

Deno.test("csv: joins an array and re-joins a delimited string, trimming whitespace", () => {
  assertEquals(csv(["a", "b"]), "a,b");
  assertEquals(csv("a, b ,c"), "a,b,c");
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(""), undefined);
});

Deno.test("formatAirtopError: surfaces the vendor message and nested error details", () => {
  const raw = JSON.stringify({
    httpStatus: 401,
    message: "invalid api key",
    errors: [{ message: "token expired" }],
  });
  const msg = formatAirtopError(401, "GET", "/v1/sessions", raw);
  assert(msg.includes("invalid api key"), msg);
  assert(msg.includes("token expired"), msg);
});

Deno.test("formatAirtopError: falls back to the raw body when it isn't the error envelope", () => {
  const msg = formatAirtopError(500, "GET", "/v1/sessions", "upstream exploded");
  assert(msg.includes("upstream exploded"), msg);
});

Deno.test("AirtopClient.data: unwraps the envelope's data field", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "s1" }) }]);
  const data = await new AirtopClient(ctx).data("/v1/sessions/s1");
  assertEquals(data, { id: "s1" });
  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1");
});

Deno.test("AirtopClient.data: builds the query string from compacted params", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ sessions: [], pagination: {} }) }]);
  await new AirtopClient(ctx).data("/v1/sessions", { query: { limit: 10, offset: undefined } });
  assertEquals(queryOf(calls[0].url), { limit: "10" });
});

Deno.test("AirtopClient.data: a POST body is sent as JSON with the right content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "s1" }) }]);
  await new AirtopClient(ctx).data("/v1/sessions", { method: "POST", body: { configuration: {} } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { configuration: {} });
});

Deno.test("AirtopClient.status: returns the HTTP status without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  const status = await new AirtopClient(ctx).status("/v1/sessions/s1", { method: "DELETE" });
  assertEquals(status, 204);
});

Deno.test("AirtopClient.aiRequest: reads modelResponse from data and credits/status from meta", async () => {
  const { ctx } = mockCtx([{
    status: 201,
    body: aiEnvelope("The login button was clicked.", {
      status: "success",
      usage: { id: "r1", credits: 3 },
    }),
  }]);
  const result = await new AirtopClient(ctx).aiRequest("/v1/sessions/s1/windows/w1/click", {
    method: "POST",
  });
  assertEquals(result.modelResponse, "The login button was clicked.");
  assertEquals(result.meta.status, "success");
  assertEquals(result.meta.usage?.credits, 3);
});

Deno.test("AirtopClient.aiRequest: a non-string modelResponse (scrape-content shape) is stringified", async () => {
  const { ctx } = mockCtx([{ status: 201, body: aiEnvelope({ title: "Example" }) }]);
  const result = await new AirtopClient(ctx).aiRequest(
    "/v1/sessions/s1/windows/w1/scrape-content",
    {
      method: "POST",
    },
  );
  assertEquals(JSON.parse(result.modelResponse), { title: "Example" });
});

Deno.test("AirtopClient: a non-2xx response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid api key") }]);
  await assertRejects(
    () => new AirtopClient(ctx).data("/v1/sessions"),
    Error,
    "invalid api key",
  );
});

Deno.test("AirtopClient: never calls global fetch — only ctx.fetch", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "s1" }) }]);
  await new AirtopClient(ctx).data("/v1/sessions/s1");
  assertEquals(calls.length, 1);
});
