import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "query");
  assertEquals(auth.apiKey?.name, "key");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends key to the query string when the request has no body", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.neverbounce.com/v4.2/single/check?email=a%40b.com",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "secret_abc123" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("key"), "secret_abc123");
  assertEquals(url.searchParams.get("email"), "a@b.com");
});

Deno.test("api-key: sign injects key into the JSON body when the request already has one", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.neverbounce.com/v4.2/jobs/create",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: JSON.stringify({ input_location: "remote_url", input: "https://x.com/f.csv" }),
  };
  const out = await auth.sign!({ request, credential: { apiKey: "secret_abc123" } }, ctx);
  const payload = JSON.parse(out.body!);
  assertEquals(payload.key, "secret_abc123");
  assertEquals(payload.input_location, "remote_url");
  // No query-string form for this endpoint — must not also be added there.
  assertEquals(new URL(out.url).searchParams.get("key"), null);
  assertEquals(out.headers["content-type"], "application/json");
});

Deno.test("api-key: test hits /account/info and reports ok on status success", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { status: "success", credits_info: {}, job_counts: {} } },
  ]);
  const result = await auth.test({ credential: { apiKey: "secret_abc123" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.neverbounce.com");
  assertEquals(url.pathname, "/v4.2/account/info");
  assertEquals(url.searchParams.get("key"), "secret_abc123");
});

Deno.test("api-key: test reports failure on status auth_failure, per NeverBounce's error-in-200 shape", async () => {
  // Deliberately answers 200 — `docs/error-handling` states every API-level
  // error, including a bad key, arrives on a 200, so `test` must not gate on
  // the status code (only the body) to catch this case.
  const { ctx } = mockCtx([
    { status: 200, body: { status: "auth_failure", message: "Invalid API Key" } },
  ]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("auth_failure"));
});

Deno.test("api-key: test surfaces other documented statuses without calling them auth failures", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { status: "throttle_triggered" } },
  ]);
  const result = await auth.test({ credential: { apiKey: "abc" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("throttle_triggered"));
});

Deno.test("api-key: test reports failure when the body carries no status field at all", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error" }]);
  const result = await auth.test({ credential: { apiKey: "secret_abc123" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
});

Deno.test("api-key: test never leaks the API key back into its own message", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { status: "auth_failure", message: "Invalid API Key" } },
  ]);
  const result = await auth.test({ credential: { apiKey: "super-secret-value" } }, ctx);
  assertEquals(result.message?.includes("super-secret-value"), false);
});
