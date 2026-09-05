import { assert, assertEquals } from "@std/assert";
import channelAccessToken, { authHeaders, PROBE_PATH } from "../../auth/channel-access-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealChannelAccessToken0000000000";

Deno.test("channel-access-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.line.me/v2/bot/info",
    headers: {} as Record<string, string>,
  };
  const signed = channelAccessToken.sign!(
    { request, credential: { channelAccessToken: TOKEN } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.line.me/v2/bot/info");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("channel-access-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ channelAccessToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("channel-access-token: the probe is /v2/bot/info", () => {
  assertEquals(PROBE_PATH, "/v2/bot/info");
});

Deno.test("channel-access-token: test passes when bot info answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: "U1", displayName: "Bot" } }]);
  const result = await channelAccessToken.test({ credential: { channelAccessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/bot/info");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("channel-access-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await channelAccessToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("channel-access-token: a missing header is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "Authorization header required. Must follow the scheme, 'Authorization: Bearer <ACCESS TOKEN>'",
      ),
    },
  ]);
  const result = await channelAccessToken.test({ credential: { channelAccessToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no token/i.test(result.message ?? ""), result.message);
});

Deno.test("channel-access-token: an invalid token is reported as rejected, with LINE's own message", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "Authentication failed. Confirm that the access token in the authorization header is valid.",
      ),
    },
  ]);
  const result = await channelAccessToken.test(
    { credential: { channelAccessToken: "garbage" } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
  assert(/Authentication failed/.test(result.message ?? ""), result.message);
});

Deno.test("channel-access-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await channelAccessToken.test({ credential: { channelAccessToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("channel-access-token: afterConnect publishes the display name and basic ID", async () => {
  const { ctx, calls } = mockCtx([
    { body: { userId: "U1", basicId: "@abc123", displayName: "Acme Support" } },
  ]);
  const display = await channelAccessToken.afterConnect!(
    { credential: { channelAccessToken: TOKEN } },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/v2/bot/info");
  assertEquals(display, { displayName: "Acme Support", basicId: "@abc123" });
});

Deno.test("channel-access-token: afterConnect stays silent when the read fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("no") }]);
  assertEquals(
    await channelAccessToken.afterConnect!({ credential: { channelAccessToken: TOKEN } }, ctx),
    {},
  );
});

Deno.test("channel-access-token: the credential field is declared secret", () => {
  for (const f of channelAccessToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(channelAccessToken.type, "bearer");
  assertEquals(typeof channelAccessToken.test, "function");
  assertEquals(typeof channelAccessToken.sign, "function");
});
