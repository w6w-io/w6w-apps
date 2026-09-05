import { assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("auth: sign() stamps a bearer header and nothing else", async () => {
  const request = { url: "https://api.recruitee.com/c/123/candidates", method: "GET", headers: {} };
  const out = await apiToken.sign!(
    { request, credential: { apiToken: "tok_abc", companyId: "123" } },
    // deno-lint-ignore no-explicit-any
    {} as any,
  );
  assertEquals(out.headers["authorization"], "Bearer tok_abc");
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("auth: test() succeeds on a 200 from the company-scoped whoami", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { admin: { id: 1, email: "a@b.com" } } }]);
  const result = await apiToken.test({ credential: { apiToken: "tok", companyId: "123" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/c/123/admin");
});

Deno.test("auth: test() reports a missing credential without any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: { companyId: "123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: test() classifies invalid_token from the response body, not the status alone", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: { error: "Token not found.", error_code: "invalid_token" } },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "bad", companyId: "123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("invalid_token"), true);
});

Deno.test("auth: test() reports a bad company id distinctly (404)", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "Page not found" } }]);
  const result = await apiToken.test({ credential: { apiToken: "tok", companyId: "999" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("999"), true);
});

Deno.test("auth: afterConnect() records companyId and email, never the token", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: { admin: { id: 1, email: "admin@example.com", membership: { role: "Owner" } } },
    },
  ]);
  const display = await apiToken.afterConnect!(
    { credential: { apiToken: "tok_abc", companyId: "123" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.companyId, "123");
  assertEquals(display.email, "admin@example.com");
  assertEquals(display.role, "Owner");
  assertEquals(JSON.stringify(display).includes("tok_abc"), false);
});

Deno.test("auth: afterConnect() still records companyId when the whoami call fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const display = await apiToken.afterConnect!(
    { credential: { apiToken: "tok", companyId: "123" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.companyId, "123");
  assertEquals("email" in display, false);
});

Deno.test("auth: the credential field is declared secret, companyId is not", () => {
  assertEquals(apiToken.type, "bearer");
  const apiTokenField = apiToken.fields?.find((f) => f.key === "apiToken");
  const companyIdField = apiToken.fields?.find((f) => f.key === "companyId");
  assertEquals(apiTokenField?.type, "secret");
  assertEquals(companyIdField?.type, "string");
  assertEquals(typeof apiToken.test, "function");
  assertEquals(typeof apiToken.sign, "function");
});
