import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the accounts.salesloft.com endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.salesloft.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://accounts.salesloft.com/oauth/token");
});

Deno.test("oauth2: sign sets a Bearer Authorization header from the access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.salesloft.com/v2/people",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok123");
});

Deno.test("oauth2: test hits GET /v2/me with the access token and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1, name: "Ada" } } }]);
  const result = await auth.test({ credential: { accessToken: "tok123" } }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok123");
  assertEquals(result.ok, true);
});

Deno.test("oauth2: test fails cleanly on a non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid token" } }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2: afterConnect derives the user label", async () => {
  const { ctx } = mockCtx([{ body: { data: { name: "Ada", email: "ada@x.io" } } }]);
  const meta = await auth.afterConnect!({ credential: { accessToken: "tok123" } }, ctx);
  assertEquals((meta.user as { name: string }).name, "Ada");
  assertEquals((meta.user as { email: string }).email, "ada@x.io");
});
