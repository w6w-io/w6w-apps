import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Google endpoints and the four Directory read/write scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2?.scopes, [
    "https://www.googleapis.com/auth/admin.directory.user",
    "https://www.googleapis.com/auth/admin.directory.group",
    "https://www.googleapis.com/auth/admin.directory.group.member",
    "https://www.googleapis.com/auth/admin.directory.orgunit",
    "https://www.googleapis.com/auth/admin.directory.customer.readonly",
  ]);
  assertEquals(auth.oauth2?.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2?.extraAuthParams?.prompt, "consent");
});

Deno.test("oauth2: sign injects Bearer access_token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "acc-xyz" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer acc-xyz");
});

Deno.test("oauth2: test with missing accessToken reports failure and skips network", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test hits a least-scope /users listing", async () => {
  const { ctx, calls } = mockCtx([{ body: { users: [] } }]);
  const result = await auth.test({ credential: { accessToken: "acc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/admin/directory/v1/users");
  assertEquals(url.searchParams.get("customer"), "my_customer");
  assertEquals(url.searchParams.get("maxResults"), "1");
});

Deno.test("oauth2: test reports failure with the vendor status on a non-admin token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "not authorized" } }]);
  const result = await auth.test({ credential: { accessToken: "acc" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("403"));
});

Deno.test("oauth2: afterConnect reads the customer's domain", async () => {
  const { ctx } = mockCtx([{ body: { id: "C123", customerDomain: "example.com" } }]);
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(out, { customer: { id: "C123", customerDomain: "example.com" } });
});
