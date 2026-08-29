import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is a bearer method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "bearer");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends Bearer using credential.apiKey", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "sk-or-v1-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer sk-or-v1-abc");
});

Deno.test("api-key: test hits GET /key and reports ok on 200", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { label: "sk-or-v1-a...b" } } }]);
  const result = await auth.test({ credential: { apiKey: "sk-or-v1-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://openrouter.ai");
  assertEquals(url.pathname, "/api/v1/key");
  assertEquals(calls[0].headers["authorization"], "Bearer sk-or-v1-abc");
});

Deno.test("api-key: test reports failure with the vendor's error message on rejection", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: { code: 401, message: "No auth credentials found" } } },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"), result.message);
  assert(result.message?.includes("No auth credentials found"), result.message);
});

Deno.test("api-key: test reports failure when the credential is missing, without a request", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0, "must not fetch without a credential to send");
});

/**
 * The probe's own response never carries the raw key — only a vendor-masked
 * label — so `test` cannot be the thing that leaks a credential it validates.
 */
Deno.test("api-key: the test probe never sends the credential anywhere but the Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await auth.test({ credential: { apiKey: "sk-or-v1-abc" } }, ctx);
  assertEquals(calls[0].body, null);
  const url = new URL(calls[0].url);
  assertEquals(url.search, "");
});
