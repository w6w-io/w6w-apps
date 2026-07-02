import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the Asana authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://app.asana.com/-/oauth_authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://app.asana.com/-/oauth_token");
  // n8n's Asana OAuth2 credential does not opt into PKCE — match that default.
  assertEquals(auth.oauth2?.pkce, false);
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

Deno.test("oauth2: test issues GET /users/me with Bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { gid: "u1" } } }]);
  const result = await auth.test({ credential: { accessToken: "acc-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/api/1.0/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer acc-abc");
});

Deno.test("oauth2: test returns the upstream status on non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("oauth2: afterConnect extracts { id, name, email } from data envelope", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { data: { gid: "u9", name: "Grace", email: "grace@example.com" } },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "x" } }, ctx);
  assertEquals(out, { user: { id: "u9", name: "Grace", email: "grace@example.com" } });
});
