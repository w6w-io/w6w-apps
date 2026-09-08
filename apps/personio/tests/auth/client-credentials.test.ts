import { assertEquals, assertRejects } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import auth from "../../auth/client-credentials.ts";
import { mockCtx } from "../_helpers.ts";

const AUTH_PATH = "/v1/auth";

Deno.test("client-credentials: exchange() mints a token via POST /v1/auth with a JSON body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, data: { token: "papi-tok-123", expires_in: 86400 } } },
  ]);

  const cred = await auth.exchange!(
    { fields: { clientId: "id-1", clientSecret: "secret-1" } },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, AUTH_PATH);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { client_id: "id-1", client_secret: "secret-1" });
  assertEquals((cred as { accessToken: string }).accessToken, "papi-tok-123");
  assertEquals(typeof (cred as { expiresAt?: string }).expiresAt, "string");
});

Deno.test("client-credentials: exchange() requires both clientId and clientSecret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "id-1" } }, ctx),
    Error,
    "required",
  );
});

Deno.test("client-credentials: exchange() surfaces Personio's own error message on failure", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: { success: false, error: { code: 403, message: "bad credentials" } } },
  ]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "id-1", clientSecret: "wrong" } }, ctx),
    Error,
    "bad credentials",
  );
});

Deno.test("client-credentials: refresh() re-mints — Personio issues no separate refresh token", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { success: true, data: { token: "papi-tok-456", expires_in: 100 } } },
  ]);
  const cred = await auth.refresh!(
    { credential: { clientId: "id-1", clientSecret: "secret-1", accessToken: "papi-tok-123" } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, AUTH_PATH);
  assertEquals((cred as { accessToken: string }).accessToken, "papi-tok-456");
});

Deno.test("client-credentials: refresh() fails loudly with no stored id/secret", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await auth.refresh!({ credential: { accessToken: "papi-tok-123" } }, ctx),
    Error,
    "no stored Client ID",
  );
});

Deno.test("client-credentials: sign() stamps Authorization Bearer with the cached token", () => {
  const request: SignableRequest = { url: "https://x", method: "GET", headers: {} };
  const signed = auth.sign!(
    { request, credential: { accessToken: "papi-tok-123" } },
    mockCtx().ctx,
  );
  assertEquals((signed as SignableRequest).headers["authorization"], "Bearer papi-tok-123");
});

Deno.test("client-credentials: test() re-mints and reports ok on success", async () => {
  const { ctx } = mockCtx([
    { status: 200, body: { success: true, data: { token: "papi-tok-789", expires_in: 100 } } },
  ]);
  const out = await auth.test({ credential: { clientId: "id-1", clientSecret: "secret-1" } }, ctx);
  assertEquals(out.ok, true);
});

Deno.test("client-credentials: test() reports failure without a stored id/secret", async () => {
  const { ctx } = mockCtx([]);
  const out = await auth.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
});

Deno.test("client-credentials: test() classifies a missing-auth (401) vs invalid-auth (403) body distinctly", async () => {
  const { ctx: ctx401 } = mockCtx([
    {
      status: 401,
      body: { success: false, error: { code: 401, message: "Authorization is not provided" } },
    },
  ]);
  const out401 = await auth.test({ credential: { clientId: "id-1", clientSecret: "s" } }, ctx401);
  assertEquals(out401.ok, false);
  assertEquals(
    out401.message,
    "Personio refused to mint an access token (Authorization is not provided). Check the Client ID and Client Secret from Personio's API Credentials settings page.",
  );

  const { ctx: ctx403 } = mockCtx([
    {
      status: 403,
      body: {
        success: false,
        error: { code: 403, message: "Provided authorization is not valid" },
      },
    },
  ]);
  const out403 = await auth.test({ credential: { clientId: "id-1", clientSecret: "s" } }, ctx403);
  assertEquals(out403.ok, false);
  assertEquals(out403.message!.includes("Provided authorization is not valid"), true);
});

Deno.test("client-credentials: fields carrying the secret are declared secret", () => {
  const secretFields = ["clientId", "clientSecret"];
  for (const f of auth.fields ?? []) {
    if (secretFields.includes(f.key)) {
      assertEquals(f.type, "secret", `${f.key}: should be type "secret"`);
    }
  }
});
