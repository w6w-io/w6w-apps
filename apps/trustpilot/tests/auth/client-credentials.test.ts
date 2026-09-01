import { assertEquals, assertRejects } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import auth from "../../auth/client-credentials.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN_PATH = "/v1/oauth/oauth-business-users-for-applications/accesstoken";

Deno.test("client-credentials: exchange() mints a token via Basic auth + grant_type=client_credentials", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "tok-123", expires_in: "359999" } },
  ]);

  const cred = await auth.exchange!(
    { fields: { clientId: "id-1", clientSecret: "secret-1", businessUserId: "user-1" } },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, TOKEN_PATH);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("id-1:secret-1")}`);
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "grant_type=client_credentials");
  assertEquals((cred as { accessToken: string }).accessToken, "tok-123");
  assertEquals((cred as { businessUserId: string }).businessUserId, "user-1");
});

Deno.test("client-credentials: exchange() requires both clientId and clientSecret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "id-1" } }, ctx),
    Error,
    "required",
  );
});

Deno.test("client-credentials: exchange() surfaces Trustpilot's own error detail on failure", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error: "invalid_client", error_description: "bad credentials" } },
  ]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "id-1", clientSecret: "wrong" } }, ctx),
    Error,
    "bad credentials",
  );
});

Deno.test("client-credentials: refresh() re-mints — the grant issues no refresh token", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { access_token: "tok-456", expires_in: 100 } },
  ]);
  const cred = await auth.refresh!(
    { credential: { clientId: "id-1", clientSecret: "secret-1", accessToken: "tok-123" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, TOKEN_PATH);
  assertEquals((cred as { accessToken: string }).accessToken, "tok-456");
});

Deno.test("client-credentials: refresh() fails loudly with no stored id/secret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await auth.refresh!({ credential: { accessToken: "tok-123" } }, ctx),
    Error,
    "no stored Client ID",
  );
});

Deno.test("client-credentials: sign() stamps Authorization Bearer and, when set, x-business-user-id", () => {
  const request: SignableRequest = { url: "https://x", method: "GET", headers: {} };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok-123", businessUserId: "user-1" } },
    mockCtx().ctx,
  );
  assertEquals((signed as SignableRequest).headers["authorization"], "Bearer tok-123");
  assertEquals((signed as SignableRequest).headers["x-business-user-id"], "user-1");
});

Deno.test("client-credentials: sign() omits x-business-user-id when none is configured", () => {
  const request: SignableRequest = { url: "https://x", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { accessToken: "tok-123" } }, mockCtx().ctx);
  assertEquals((signed as SignableRequest).headers["x-business-user-id"], undefined);
});

Deno.test("client-credentials: test() re-mints and reports ok on success", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { access_token: "tok-789", expires_in: 100 } }]);
  const out = await auth.test({ credential: { clientId: "id-1", clientSecret: "secret-1" } }, ctx);
  assertEquals(out.ok, true);
});

Deno.test("client-credentials: test() reports failure without a stored id/secret", async () => {
  const { ctx } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("client-credentials: fields carrying the secret are declared secret", () => {
  const secretFields = ["clientId", "clientSecret"];
  for (const f of auth.fields ?? []) {
    if (secretFields.includes(f.key)) {
      assertEquals(f.type, "secret", `${f.key}: should be type "secret"`);
    }
  }
});
