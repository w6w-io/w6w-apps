import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares an apiKey-typed method sending an `api-key` header", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "api-key");
  assertEquals(auth.apiKey?.prefix, "");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign injects the raw key as an `api-key` header (no prefix)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.brevo.com/v3/contacts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "xkeysib-abc" } }, ctx);
  assertEquals(out.headers["api-key"], "xkeysib-abc");
  // Explicitly ensure we did NOT set an Authorization header.
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-key: test with missing apiKey reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"), "message should mention apiKey");
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test hits GET /v3/account with the api-key header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { email: "x@y.com" } }]);
  const result = await auth.test({ credential: { apiKey: "xkeysib-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.brevo.com");
  assertEquals(url.pathname, "/v3/account");
  assertEquals(calls[0].headers["api-key"], "xkeysib-abc");
});

Deno.test("api-key: test surfaces upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: afterConnect returns the account profile fields", async () => {
  const { ctx } = mockCtx([{
    body: { email: "ada@example.com", firstName: "Ada", lastName: "Lovelace", companyName: "Analytical Engines" },
  }]);
  const out = await auth.afterConnect!({ credential: { apiKey: "xkeysib-abc" } }, ctx);
  const account = (out as { account: Record<string, unknown> }).account;
  assertEquals(account.email, "ada@example.com");
  assertEquals(account.firstName, "Ada");
  assertEquals(account.companyName, "Analytical Engines");
});
