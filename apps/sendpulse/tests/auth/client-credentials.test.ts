import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

Deno.test("client-credentials: collects ID and Secret, both secret fields", () => {
  assertEquals(auth.key, "client-credentials");
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["clientId", "clientSecret"]);
  for (const f of auth.fields ?? []) assertEquals(f.type, "secret", `${f.key} not secret`);
});

Deno.test("client-credentials: exchange mints a token against the shared token endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 3600 } }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "cid", clientSecret: "sec" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.sendpulse.com/oauth/access_token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body ?? ""), {
    grant_type: "client_credentials",
    client_id: "cid",
    client_secret: "sec",
  });

  assertEquals(cred.accessToken, "tok");
  assertEquals(cred.clientId, "cid");
  assertEquals(cred.clientSecret, "sec");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("client-credentials: expiry leaves headroom before SendPulse's documented 1-hour TTL", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "tok", expires_in: 3600 } }]);
  const cred = await auth.exchange!(
    { fields: { clientId: "c", clientSecret: "s" } },
    ctx,
  ) as { expiresAt: string };
  const ttlMs = new Date(cred.expiresAt).getTime() - Date.now();
  assert(ttlMs < 3600_000, "must expire before SendPulse's own token does");
  assert(ttlMs > 3_500_000, "but not so early that it churns");
});

Deno.test("client-credentials: exchange refuses missing fields without a request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(auth.exchange!({ fields: { clientId: "c" } }, ctx)),
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange surfaces SendPulse's rejection reason", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "Client authentication failed" },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        auth.exchange!({ fields: { clientId: "c", clientSecret: "wrong" } }, ctx),
      ),
    Error,
    "Client authentication failed",
  );
});

Deno.test("client-credentials: refresh re-mints from the stored ID/Secret — no refresh token exists", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok2", expires_in: 3600 } }]);
  const cred = await auth.refresh!(
    { credential: { clientId: "cid", clientSecret: "sec", accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.sendpulse.com/oauth/access_token");
  assertEquals(cred.accessToken, "tok2");
});

Deno.test("client-credentials: sign stamps the current token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.sendpulse.com/crm/v1/users",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("client-credentials: test probes GET /balance and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { currency: "USD", balance_currency: 1 } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://api.sendpulse.com/balance");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("client-credentials: test tells the user to reconnect when there is no access token", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing an access token",
  });
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: test reports a 401 without throwing", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized!", error_code: 401 } }]);
  const result = await auth.test({ credential: { accessToken: "bogus" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("client-credentials: test reports a 403 distinctly from a 401", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden", error_code: 403 } }]);
  const result = await auth.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("403"));
  assert(!result.message?.includes("401"));
});
