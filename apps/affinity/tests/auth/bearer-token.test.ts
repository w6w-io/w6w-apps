import { assertEquals } from "@std/assert";
import bearerToken, { authHeaders } from "../../auth/bearer-token.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeaders: stamps the Bearer header", () => {
  assertEquals(authHeaders({ apiKey: "secret123" }), { authorization: "Bearer secret123" });
});

Deno.test("sign: injects the Authorization header onto the request and returns it", () => {
  const request = { headers: {} as Record<string, string> };
  const out = bearerToken.sign!(
    { request: request as never, credential: { apiKey: "secret123" } } as never,
    {} as never,
  );
  assertEquals((out as typeof request).headers["authorization"], "Bearer secret123");
});

Deno.test("test: ok when whoami answers 200", async () => {
  const { ctx, calls } = mockCtx([
    { body: { tenant: { id: 1, name: "Acme" }, user: { id: 2 }, grant: { type: "api_key" } } },
  ]);
  const result = await bearerToken.test!({ credential: { apiKey: "good" } } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), "/auth/whoami");
  assertEquals(calls[0].headers["authorization"], "Bearer good");
});

Deno.test("test: missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearerToken.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The vendor's real 401 body is plain text ("Unauthorized API Key.") under
 * text/html, not JSON — this pins that `test` handles it without a parse
 * crash and surfaces the vendor's own wording.
 */
Deno.test("test: a 401 with a plain-text body is read as text, not crashed on as JSON", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: "Unauthorized API Key.",
      headers: { "content-type": "text/html;charset=utf-8" },
    },
  ]);
  const result = await bearerToken.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Unauthorized API Key."), true, result.message);
});

Deno.test("afterConnect: publishes tenant/user name and nothing else", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        tenant: { id: 1, name: "Acme Ventures" },
        user: { id: 2, firstName: "Jane", lastName: "Doe", email: "jane@acme.co" },
        grant: { type: "api_key" },
      },
    },
  ]);
  const out = await bearerToken.afterConnect!({ credential: { apiKey: "good" } } as never, ctx);
  assertEquals(out, { tenantName: "Acme Ventures", userName: "Jane Doe" });
});

Deno.test("afterConnect: fails silently (empty object) when whoami errors", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized API Key." }]);
  const out = await bearerToken.afterConnect!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(out, {});
});
