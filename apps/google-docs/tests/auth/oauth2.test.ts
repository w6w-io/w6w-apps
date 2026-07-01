import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Google's authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: requests documents + drive.file scopes", () => {
  assertEquals(auth.oauth2?.scopes, [
    "https://www.googleapis.com/auth/documents",
    "https://www.googleapis.com/auth/drive.file",
  ]);
});

Deno.test("oauth2: forces offline + consent to obtain a refresh token", () => {
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
});

Deno.test("oauth2: sign appends Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-123");
});

Deno.test("oauth2: test with missing accessToken reports the failure", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test hits Google's tokeninfo endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { scope: "…" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://oauth2.googleapis.com");
  assertEquals(url.pathname, "/tokeninfo");
  assertEquals(url.searchParams.get("access_token"), "acc-abc");
});

Deno.test("oauth2: test returns upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
