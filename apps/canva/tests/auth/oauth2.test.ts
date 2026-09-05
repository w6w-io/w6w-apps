import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import oauth2 from "../../auth/oauth2.ts";

Deno.test("oauth2: sign() stamps a Bearer authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await oauth2.sign!(
    { request, credential: { accessToken: "tok123" } } as unknown as Parameters<
      NonNullable<typeof oauth2.sign>
    >[0],
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok123");
});

Deno.test("oauth2: test() probes /rest/v1/users/me and passes on 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { team_user: { user_id: "U1", team_id: "T1" } } }]);
  const result = await oauth2.test!(
    { credential: { accessToken: "tok123" } } as Parameters<
      NonNullable<typeof oauth2.test>
    >[0],
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok123");
  assertEquals(result, { ok: true });
});

Deno.test("oauth2: test() fails without echoing the credential, using the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "invalid_access_token", message: "Access token is invalid" },
  }]);
  const result = await oauth2.test!(
    { credential: { accessToken: "bad-token" } } as Parameters<NonNullable<typeof oauth2.test>>[0],
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(result.message, "Access token is invalid");
  assert(!String(result.message).includes("bad-token"), "test() must not echo the credential");
});

Deno.test("oauth2: test() fails cleanly when the credential is missing", async () => {
  const { ctx } = mockCtx([]);
  const result = await oauth2.test!(
    { credential: {} } as Parameters<NonNullable<typeof oauth2.test>>[0],
    ctx,
  );
  assertEquals(result.ok, false);
});

Deno.test("oauth2: afterConnect() fetches the display name and tolerates a missing scope", async () => {
  const { ctx: okCtx } = mockCtx([{ body: { profile: { display_name: "Jane Doe" } } }]);
  const ok = await oauth2.afterConnect!(
    {} as Parameters<NonNullable<typeof oauth2.afterConnect>>[0],
    okCtx,
  );
  assertEquals(ok, { user: { display_name: "Jane Doe" } });

  const { ctx: failCtx } = mockCtx([{ status: 403, body: { code: "missing_scope" } }]);
  const failed = await oauth2.afterConnect!(
    {} as Parameters<NonNullable<typeof oauth2.afterConnect>>[0],
    failCtx,
  );
  assertEquals(failed, {});
});

Deno.test("oauth2: declares PKCE and the union of scopes this app's actions use", () => {
  assertEquals(oauth2.type, "oauth2");
  assert(oauth2.oauth2?.pkce, "PKCE must be enabled — it's the only auth model Canva publishes");
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://www.canva.com/api/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.canva.com/rest/v1/oauth/token");
  for (
    const scope of [
      "design:meta:read",
      "design:content:read",
      "design:content:write",
      "folder:read",
      "folder:write",
      "asset:read",
      "asset:write",
      "brandtemplate:meta:read",
      "brandtemplate:content:read",
      "profile:read",
    ]
  ) {
    assert(oauth2.oauth2?.scopes?.includes(scope), `missing scope: ${scope}`);
  }
});
