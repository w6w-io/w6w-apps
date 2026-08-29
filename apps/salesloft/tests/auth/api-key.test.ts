import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares the Authorization bearer wiring", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Authorization", prefix: "Bearer " });
});

Deno.test("api-key: sign sets a Bearer Authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.salesloft.com/v2/people",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "ak_abc123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer ak_abc123");
});

Deno.test("api-key: test hits GET /v2/me with the key and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1, name: "Ada" } } }]);
  const result = await auth.test({ credential: { apiKey: "ak_abc123" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/me");
  assertEquals(calls[0].headers["authorization"], "Bearer ak_abc123");
  assertEquals(result.ok, true);
});

Deno.test("api-key: test fails cleanly on a non-2xx without echoing the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid token" } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("bad"), false);
});

Deno.test("api-key: test reports missing credential without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: afterConnect derives the user label", async () => {
  const { ctx } = mockCtx([{ body: { data: { name: "Ada", email: "ada@x.io" } } }]);
  const meta = await auth.afterConnect!({ credential: { apiKey: "ak_abc123" } }, ctx);
  assertEquals((meta.user as { name: string }).name, "Ada");
  assertEquals((meta.user as { email: string }).email, "ada@x.io");
});
