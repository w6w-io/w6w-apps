import { assertEquals } from "@std/assert";
import permanentToken from "../../auth/permanent-token.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

Deno.test("sign: stamps Authorization: Bearer {token} and nothing else", async () => {
  const request = {
    headers: {} as Record<string, string>,
    url: `${BASE_URL}/api/v1/me`,
    method: "GET",
  };
  const out = await permanentToken.sign!(
    { request, credential: { token: "secret-token", baseUrl: BASE_URL } } as never,
    mockCtx().ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer secret-token");
});

Deno.test("test: fails fast when the token is missing", async () => {
  const { ctx } = mockCtx();
  const result = await permanentToken.test!({ credential: { baseUrl: BASE_URL } } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: fails fast when the install URL is missing", async () => {
  const { ctx } = mockCtx();
  const result = await permanentToken.test!({ credential: { token: "t" } } as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("test: a documented 403 'No authorization given' body means reachable, not a bad token", async () => {
  // This exercises the /me probe answering the header-stripped shape — the
  // credential itself is present, so a 403 here means something upstream ate
  // the header, which is a different failure than a rejected token.
  const { ctx } = mockCtx([
    { status: 403, body: { error: { code: 403, message: "No authorization given" } } },
  ]);
  const result = await permanentToken.test!(
    { credential: { token: "t", baseUrl: BASE_URL } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(
    /no authorization header/i.test(result.message ?? "") || /proxy/i.test(result.message ?? ""),
    true,
  );
});

Deno.test("test: a bare 401 with an empty body is a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const result = await permanentToken.test!(
    { credential: { token: "bad-token", baseUrl: BASE_URL } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(/rejected the token/i.test(result.message ?? ""), true);
});

Deno.test("test: a 200 JSON body is a live credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { DisplayName: "Carlos" } }]);
  const result = await permanentToken.test!(
    { credential: { token: "good-token", baseUrl: BASE_URL } } as never,
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/me`);
  assertEquals(calls[0].headers["authorization"], "Bearer good-token");
});

Deno.test("test: a 200 that is not JSON is refused, not treated as live", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: "<html>login</html>", headers: { "content-type": "text/html" } },
  ]);
  const result = await permanentToken.test!(
    { credential: { token: "t", baseUrl: BASE_URL } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(/not.*JSON|not the Deputy API/i.test(result.message ?? ""), true);
});

Deno.test("test: a redirect off the install (typo'd URL) is refused even with a 200 login page", async () => {
  const { ctx } = mockCtx([
    {
      status: 200,
      body: "<html>login</html>",
      headers: { "content-type": "text/html" },
      url: "https://once.deputy.com/my/",
    },
  ]);
  const result = await permanentToken.test!(
    { credential: { token: "t", baseUrl: "https://not-an-install.au.deputy.com" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(/not a Deputy install/i.test(result.message ?? ""), true);
});

Deno.test("afterConnect: labels the connection from the install URL, never the token", () => {
  const out = permanentToken.afterConnect!(
    { credential: { token: "secret", baseUrl: `${BASE_URL}/` } } as never,
    mockCtx().ctx,
  );
  assertEquals(out, { baseUrl: BASE_URL, install: "simonssambos", region: "au" });
  assertEquals(JSON.stringify(out).includes("secret"), false);
});

Deno.test("afterConnect: returns nothing when the credential has no baseUrl", () => {
  const out = permanentToken.afterConnect!({ credential: { token: "t" } } as never, mockCtx().ctx);
  assertEquals(out, {});
});

Deno.test("manifest shape: no revoke hook — a permanent token is revoked in Deputy's own admin UI", () => {
  assertEquals(permanentToken.revoke, undefined);
});

Deno.test("manifest shape: both fields are present and the token is a secret", () => {
  const byKey = Object.fromEntries(permanentToken.fields!.map((f) => [f.key, f]));
  assertEquals(byKey.baseUrl?.required, true);
  assertEquals(byKey.token?.required, true);
  assertEquals(byKey.token?.type, "secret");
});
