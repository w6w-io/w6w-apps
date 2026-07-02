import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Dropbox authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://www.dropbox.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.dropboxapi.com/oauth2/token");
});

Deno.test("oauth2: requests offline access so a refresh token is issued", () => {
  assertEquals(auth.oauth2?.extraAuthParams?.token_access_type, "offline");
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

Deno.test("oauth2: test POSTs users/get_current_account with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account_id: "dbid:1" } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/2/users/get_current_account");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});
