import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "query");
  assertEquals(auth.apiKey?.name, "api_key");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign appends api_key to the query string when the request has no body", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.zerobounce.net/v2/validate?email=a%40b.com",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "abc123" } }, ctx);
  const url = new URL(out.url);
  assertEquals(url.searchParams.get("api_key"), "abc123");
  assertEquals(url.searchParams.get("email"), "a@b.com");
});

Deno.test("api-key: sign injects api_key into the JSON body when the request already has one", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.zerobounce.net/v2/validatebatch",
    method: "POST" as const,
    headers: {} as Record<string, string>,
    body: JSON.stringify({ email_batch: [{ email_address: "a@b.com" }] }),
  };
  const out = await auth.sign!({ request, credential: { apiKey: "abc123" } }, ctx);
  const payload = JSON.parse(out.body!);
  assertEquals(payload.api_key, "abc123");
  assertEquals(payload.email_batch, [{ email_address: "a@b.com" }]);
  // No query-string form for this endpoint — must not also be added there.
  assertEquals(new URL(out.url).searchParams.get("api_key"), null);
  assertEquals(out.headers["content-type"], "application/json");
});

Deno.test("api-key: test hits getcredits on the default host and reports ok for a positive balance", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Credits: 2375323 } }]);
  const result = await auth.test({ credential: { apiKey: "abc123" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.zerobounce.net");
  assertEquals(url.pathname, "/v2/getcredits");
  assertEquals(url.searchParams.get("api_key"), "abc123");
});

Deno.test("api-key: test reports failure when Credits is -1, per the vendor's documented meaning", async () => {
  // Deliberately answers 200 — the vendor's own "Error Response" example for
  // this endpoint carries no distinct HTTP status, so `test` must not gate on
  // the status code (only the body) to catch this case.
  const { ctx } = mockCtx([{ status: 200, body: { Credits: -1 } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("-1"));
});

Deno.test("api-key: test reports failure when the body carries no Credits field at all", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "internal error" }]);
  const result = await auth.test({ credential: { apiKey: "abc123" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("500"));
});

Deno.test("api-key: test never leaks the API key back into its own message", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { Credits: -1 } }]);
  const result = await auth.test({ credential: { apiKey: "super-secret-value" } }, ctx);
  assertEquals(result.message?.includes("super-secret-value"), false);
});
