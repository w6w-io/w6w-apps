import { assert, assertEquals } from "@std/assert";
import password from "../../auth/password.ts";
import { ACCESS_TOKEN, HOMESERVER, matrixError, mockCtx } from "../_helpers.ts";

Deno.test("auth: is a custom login flow, not the fixed-endpoint oauth2 shape", () => {
  assertEquals(password.key, "password");
  assertEquals(password.type, "custom");
  const fields = password.fields ?? [];
  assertEquals(fields.map((f) => f.key), [
    "homeserverUrl",
    "userId",
    "userPassword",
    "deviceDisplayName",
  ]);
  assertEquals(fields.find((f) => f.key === "userPassword")?.type, "secret");
});

Deno.test("exchange: POSTs m.login.password with an m.id.user identifier", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        access_token: "new_token",
        device_id: "DEVICE1",
        user_id: "@alice:example.org",
        refresh_token: "refresh1",
        expires_in_ms: 3_600_000,
      },
    },
  ]);
  const cred = await password.exchange!(
    { fields: { homeserverUrl: HOMESERVER, userId: "alice", userPassword: "hunter2" } },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/login`);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "m.login.password");
  assertEquals(body.identifier, { type: "m.id.user", user: "alice" });
  assertEquals(body.password, "hunter2");
  assertEquals(body.refresh_token, true);
  assertEquals(body.initial_device_display_name, "w6w");

  assertEquals(cred.accessToken, "new_token");
  assertEquals(cred.deviceId, "DEVICE1");
  assertEquals(cred.userId, "@alice:example.org");
  assertEquals(cred.refreshToken, "refresh1");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("exchange: rejects a missing username or password without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await Promise.resolve(
    password.exchange!({ fields: { homeserverUrl: HOMESERVER, userId: "alice" } }, ctx),
  )
    .then(() => {
      throw new Error("expected exchange to reject");
    })
    .catch((err: unknown) => assert(String(err).includes("required")));
  assertEquals(calls.length, 0);
});

Deno.test("exchange: a homeserver rejection surfaces the errcode", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: matrixError("M_FORBIDDEN", "Invalid password") },
  ]);
  await Promise.resolve(
    password.exchange!(
      { fields: { homeserverUrl: HOMESERVER, userId: "alice", userPassword: "wrong" } },
      ctx,
    ),
  )
    .then(() => {
      throw new Error("expected exchange to reject");
    })
    .catch((err: unknown) => assert(String(err).includes("M_FORBIDDEN")));
});

Deno.test("refresh: spends the stored refresh token for a new access token", async () => {
  const { ctx, calls } = mockCtx([
    { body: { access_token: "second_token", refresh_token: "refresh2", expires_in_ms: 1_800_000 } },
  ]);
  const next = await password.refresh!(
    { credential: { homeserverUrl: HOMESERVER, refreshToken: "refresh1", accessToken: "stale" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/refresh`);
  assertEquals(JSON.parse(calls[0].body!), { refresh_token: "refresh1" });
  assertEquals(next.accessToken, "second_token");
  assertEquals(next.refreshToken, "refresh2");
});

Deno.test("refresh: re-uses the old refresh token when the homeserver issues none", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "second_token" } }]);
  const next = await password.refresh!(
    { credential: { homeserverUrl: HOMESERVER, refreshToken: "refresh1", accessToken: "stale" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(next.refreshToken, "refresh1");
});

Deno.test("refresh: refuses to guess when there is no refresh token on file", async () => {
  const { ctx, calls } = mockCtx([]);
  await Promise.resolve(password.refresh!({ credential: { homeserverUrl: HOMESERVER } }, ctx))
    .then(() => {
      throw new Error("expected refresh to reject");
    })
    .catch((err: unknown) => assert(String(err).includes("reconnect")));
  assertEquals(calls.length, 0);
});

Deno.test("sign: stamps the bearer header", () => {
  const { ctx } = mockCtx([]);
  const request = {
    url: `${HOMESERVER}/_matrix/client/v3/joined_rooms`,
    headers: {} as Record<string, string>,
  };
  const signed = password.sign!(
    { request, credential: { accessToken: ACCESS_TOKEN } } as never,
    ctx,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], `Bearer ${ACCESS_TOKEN}`);
});

Deno.test("test: probes account/whoami on the credential's own homeserver", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_id: "@alice:example.org" } }]);
  const result = await password.test!(
    { credential: { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/account/whoami`);
});

Deno.test("revoke: POSTs logout with the connection's own token, and never throws", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await password.revoke!(
    { credential: { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN } } as never,
    ctx,
  );
  assertEquals(calls[0].url, `${HOMESERVER}/_matrix/client/v3/logout`);
  assertEquals(calls[0].headers["authorization"], `Bearer ${ACCESS_TOKEN}`);

  // A homeserver that cannot be reached at disconnect time must not block disconnecting.
  const unreachable = mockCtx([]);
  await password.revoke!(
    { credential: { homeserverUrl: HOMESERVER, accessToken: ACCESS_TOKEN } } as never,
    unreachable.ctx,
  );
});
