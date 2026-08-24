import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  compact,
  encodeBase64,
  GrainClient,
  readRateLimit,
} from "../../lib/client.ts";

Deno.test("GrainClient.url: builds under the public-api prefix", () => {
  assertEquals(GrainClient.url("/v2/teams"), "https://api.grain.com/_/public-api/v2/teams");
});

Deno.test("GrainClient.send: always sends Public-Api-Version and accept, never authorization", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GrainClient(ctx).send("/v2/teams", { method: "POST", body: {} });
  assertEquals(calls[0].headers["public-api-version"], API_VERSION);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("GrainClient.send: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GrainClient(ctx).send("/v2/recordings", { method: "POST", body: { cursor: "abc" } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ cursor: "abc" }));
});

Deno.test("GrainClient.request: parses a JSON body", async () => {
  const { ctx } = mockCtx([{ body: { teams: [{ id: "t1", name: "My Team" }] } }]);
  const result = await new GrainClient(ctx).request<{ teams: unknown[] }>("/v2/teams", {
    method: "POST",
    body: {},
  });
  assertEquals(result, { teams: [{ id: "t1", name: "My Team" }] });
});

Deno.test("GrainClient.request: parses a bare JSON array (the transcript endpoint's shape)", async () => {
  const { ctx } = mockCtx([{ body: [{ speaker: "Obi Wan Kenobi", text: "Hello there." }] }]);
  const result = await new GrainClient(ctx).request<unknown[]>("/v2/recordings/r1/transcript");
  assertEquals(result, [{ speaker: "Obi Wan Kenobi", text: "Hello there." }]);
});

Deno.test("GrainClient.request: returns undefined for an empty body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const result = await new GrainClient(ctx).request("/v2/hooks/h1", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("GrainClient.request: throws with status and truncated body on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "unauthorized" }]);
  await assertRejects(
    () => new GrainClient(ctx).request("/v2/teams", { method: "POST", body: {} }),
    Error,
    "Grain 401",
  );
});

Deno.test("GrainClient.request: throws on a non-JSON success body", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "not json{{",
    headers: { "content-type": "text/plain" },
  }]);
  await assertRejects(
    () => new GrainClient(ctx).request("/v2/teams", { method: "POST", body: {} }),
    Error,
    "non-JSON",
  );
});

Deno.test("compact: drops undefined, null, empty string and empty array values", () => {
  assertEquals(
    compact({ a: "x", b: undefined, c: null, d: "", e: [], f: 0, g: false }),
    { a: "x", f: 0, g: false },
  );
});

Deno.test("readRateLimit: reads the documented headers case-insensitively", () => {
  const headers = new Headers({
    "X-RateLimit-Limit": "300",
    "X-RateLimit-Remaining": "42",
  });
  assertEquals(readRateLimit(headers), { limit: 300, remaining: 42, retryAfterSeconds: undefined });
});

Deno.test("readRateLimit: reads Retry-After only when present (the 429 case)", () => {
  const headers = new Headers({ "Retry-After": "30" });
  assertEquals(readRateLimit(headers).retryAfterSeconds, 30);
});

Deno.test("encodeBase64: round-trips through atob", () => {
  const bytes = new TextEncoder().encode("hello");
  const encoded = encodeBase64(bytes);
  assertEquals(atob(encoded), "hello");
});
