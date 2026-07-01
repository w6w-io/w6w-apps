import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the WordPress.com authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://public-api.wordpress.com/oauth2/authorize",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://public-api.wordpress.com/oauth2/token");
  // WordPress.com's OAuth server doesn't support PKCE — make sure it stays off.
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: exposes a wordpressSite input field", () => {
  const site = auth.fields?.find((f) => f.key === "wordpressSite");
  assert(site, "must declare a `wordpressSite` field");
  assertEquals(site.required, true);
});

Deno.test("oauth2: sign appends a Bearer access token", async () => {
  const { ctx } = mockCtx();
  const request = { url: "https://x", method: "GET" as const, headers: {} as Record<string, string> };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test with missing accessToken reports failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { wordpressSite: "myblog.wordpress.com" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test with missing wordpressSite reports failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("wordpressSite"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test issues GET .../users/me with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const result = await auth.test(
    { credential: { accessToken: "acc-abc", wordpressSite: "myblog.wordpress.com" } },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(
    calls[0].url,
    "https://public-api.wordpress.com/wp/v2/sites/myblog.wordpress.com/users/me",
  );
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    { credential: { accessToken: "bad", wordpressSite: "myblog.wordpress.com" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});
