import { assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { DEFAULT_CREDENTIAL, mockCtx, pathOf } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

Deno.test("sign: stamps `Authorization: Token <apiKey>`", async () => {
  const request = { headers: {} as Record<string, string> };
  const out = await apiKey.sign!(
    { request, credential: DEFAULT_CREDENTIAL } as never,
    {} as HookContext,
  );
  assertEquals(out.headers["authorization"], "Token token-1");
});

Deno.test("test: calls GET /teams/ and returns ok on success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { count: 1, results: [] } }]);
  const result = await apiKey.test!({ credential: DEFAULT_CREDENTIAL } as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/api/v1/teams/");
  assertEquals(calls[0].headers["authorization"], "Token token-1");
});

Deno.test("test: surfaces SignRequest's `detail` message on a bad token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid token" } }]);
  const result = await apiKey.test!({ credential: DEFAULT_CREDENTIAL } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Invalid token"), true);
});

Deno.test("test: fails fast when the credential has no apiKey, without a fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test!({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("afterConnect: records the first team's name, never the token", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { count: 1, results: [{ name: "Acme Inc", subdomain: "acme" }] } },
  ]);
  const out = await apiKey.afterConnect!({ credential: DEFAULT_CREDENTIAL } as never, ctx);
  assertEquals(out, { teamName: "Acme Inc", teamSubdomain: "acme" });
  assertEquals(JSON.stringify(out).includes("token-1"), false);
});

Deno.test("afterConnect: returns {} when the team list is empty", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { count: 0, results: [] } }]);
  const out = await apiKey.afterConnect!({ credential: DEFAULT_CREDENTIAL } as never, ctx);
  assertEquals(out, {});
});

Deno.test("afterConnect: returns {} when the request fails, without throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "Invalid token" } }]);
  const out = await apiKey.afterConnect!({ credential: DEFAULT_CREDENTIAL } as never, ctx);
  assertEquals(out, {});
});
