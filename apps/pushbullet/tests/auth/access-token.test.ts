import { assert, assertEquals } from "@std/assert";
import accessToken, { authHeaders, WHOAMI_PATH } from "../../auth/access-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "o.unitTestFixtureNotARealAccessToken0000";

Deno.test("access-token: sign stamps the Access-Token header, not Authorization", () => {
  const request = {
    method: "GET",
    url: "https://api.pushbullet.com/v2/pushes",
    headers: {} as Record<string, string>,
  };
  const signed = accessToken.sign!(
    { request, credential: { accessToken: TOKEN } },
    {} as never,
  ) as {
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["access-token"], TOKEN);
  assertEquals("authorization" in signed.headers, false);
});

Deno.test("access-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ accessToken: TOKEN }), { "access-token": TOKEN });
});

Deno.test("access-token: the probe is /users/me — Pushbullet's only account endpoint", () => {
  assertEquals(WHOAMI_PATH, "/users/me");
});

Deno.test("access-token: test passes and hits GET /v2/users/me with the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "u1", name: "Elon Musk" } }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(calls[0].headers["access-token"], TOKEN);
});

Deno.test("access-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await accessToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: a 401 is reported as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid_request", "no valid token") }]);
  const result = await accessToken.test({ credential: { accessToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
});

Deno.test("access-token: a 403 is reported as a refusal, distinct from a bad token", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("invalid_request", "not valid for this request"),
  }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
});

Deno.test("access-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await accessToken.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("access-token: afterConnect publishes only name/email/userIden", async () => {
  const { ctx, calls } = mockCtx([
    { body: { iden: "u1", name: "Elon Musk", email: "elon@example.com", max_upload_size: 1 } },
  ]);
  const display = await accessToken.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(display, { name: "Elon Musk", email: "elon@example.com", userIden: "u1" });
});

Deno.test("access-token: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid_request", "no") }]);
  assertEquals(await accessToken.afterConnect!({ credential: { accessToken: TOKEN } }, ctx), {});
});

Deno.test("access-token: the credential field is declared secret", () => {
  for (const f of accessToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
