import { assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: sign() stamps X-Api-Key and returns the request", async () => {
  const { ctx } = mockCtx();
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = await apiKey.sign!({ request, credential: { apiKey: "secret-123" } }, ctx);
  assertEquals(out.headers["x-api-key"], "secret-123");
});

Deno.test("authHeaders: builds the exact header ServiceM8 documents", () => {
  assertEquals(authHeaders({ apiKey: "k" }), { "x-api-key": "k" });
});

Deno.test("api-key: test() fails fast on an empty credential, no network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test() probes GET /vendor.json and succeeds on an array body", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "v1", name: "Acme Plumbing" }] }]);
  const out = await apiKey.test({ credential: { apiKey: "good-key" } }, ctx);

  assertEquals(pathOf(calls[0].url), `/api_1.0${PROBE_PATH}`);
  assertEquals(calls[0].headers["x-api-key"], "good-key");
  assertEquals(out.ok, true);
});

Deno.test("api-key: test() reports the opaque-401 caveat, not a bare 'wrong key'", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { errorCode: 401, message: "Authorization Required" } },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "bad-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("identical"), true);
});

Deno.test("api-key: test() surfaces a 429 as rate-limited, not as an invalid key", async () => {
  const { ctx } = mockCtx([
    {
      status: 429,
      body: { errorCode: 429, message: "Number of allowed API requests per minute exceeded" },
    },
  ]);
  const out = await apiKey.test({ credential: { apiKey: "some-key" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("rate-limited"), true);
});

Deno.test("api-key: test() rejects a 200 with an unexpected (non-array) body", async () => {
  const { ctx } = mockCtx([{ body: { not: "an array" } }]);
  const out = await apiKey.test({ credential: { apiKey: "some-key" } }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("api-key: afterConnect() surfaces only name and email", async () => {
  const { ctx } = mockCtx([
    { body: [{ uuid: "v1", name: "Acme Plumbing", email: "ops@acme.example", currency: "USD" }] },
  ]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(out, { name: "Acme Plumbing", email: "ops@acme.example" });
});

Deno.test("api-key: afterConnect() fails silently on a bad response", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  const out = await apiKey.afterConnect!({ credential: { apiKey: "k" } }, ctx);
  assertEquals(out, {});
});

Deno.test("api-key: fields declare the credential as secret", () => {
  const field = apiKey.fields?.find((f) => f.key === "apiKey");
  assertEquals(field?.type, "secret");
  assertEquals(field?.required, true);
});

Deno.test("api-key: apiKey config matches the documented header", () => {
  assertEquals(apiKey.apiKey, { in: "header", name: "X-Api-Key" });
});
