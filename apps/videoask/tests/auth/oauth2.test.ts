import { assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { detailError, mockCtx } from "../_helpers.ts";

Deno.test("oauth2.sign: stamps the bearer header and never calls fetch", () => {
  const { ctx, calls } = mockCtx([]);
  const request = { headers: {} as Record<string, string> };
  const out = oauth2.sign!(
    { request, credential: { accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals((out as typeof request).headers["authorization"], "Bearer tok-1");
  assertEquals(calls.length, 0);
});

Deno.test("oauth2.test: missing accessToken fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2.test: a live /me response is ok", async () => {
  const { ctx } = mockCtx([{ body: { user_id: "u1" } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok-1" } } as never, ctx);
  assertEquals(result.ok, true);
});

Deno.test("oauth2.test: a 401 with detail is reported, not swallowed as a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: detailError("Error decoding token.") }]);
  const result = await oauth2.test({ credential: { accessToken: "bad" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("Error decoding token."), true);
});

Deno.test("oauth2.afterConnect: publishes username/userId/email, nothing else", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        user_id: "u1",
        username: "John Doe",
        email: "john@example.com",
        terms_and_conditions: true,
      },
    },
  ]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: "tok-1" } } as never, ctx);
  assertEquals(result, { username: "John Doe", userId: "u1", email: "john@example.com" });
});

Deno.test("oauth2.afterConnect: a failed /me fails open (empty object), not an exception", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await oauth2.afterConnect!({ credential: { accessToken: "tok-1" } } as never, ctx);
  assertEquals(result, {});
});

Deno.test("oauth2: declares the offline_access scope and the Auth0 audience param", () => {
  const config = (oauth2 as unknown as {
    oauth2: { scopes?: string[]; extraAuthParams?: Record<string, string> };
  }).oauth2;
  assertEquals(config.scopes?.includes("offline_access"), true);
  assertEquals(config.extraAuthParams?.audience, "https://api.videoask.com/");
});
