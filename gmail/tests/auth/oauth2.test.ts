import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Google endpoints and the two Gmail scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://accounts.google.com/o/oauth2/v2/auth",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.scopes, [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
  ]);
  assertEquals(auth.oauth2?.pkce, true);
  // Google needs both to hand back a refresh token; guard against regressions.
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://gmail.googleapis.com/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accessToken: "acc-123" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test issues GET /users/me/profile with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { emailAddress: "u@example.com" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/gmail/v1/users/me/profile",
  );
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test surfaces upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("oauth2: afterConnect returns the account's email", async () => {
  const { ctx } = mockCtx([{ body: { emailAddress: "person@example.com" } }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(
    (out as { user: { email: string } }).user.email,
    "person@example.com",
  );
});
