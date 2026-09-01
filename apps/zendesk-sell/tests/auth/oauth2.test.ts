import { assert, assertEquals } from "@std/assert";
import oauth2, { PROBE_PATH } from "../../auth/oauth2.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "unit-test-access-token-not-real";

Deno.test("oauth2: sign stamps the bearer header", () => {
  const request = {
    method: "GET",
    url: "https://api.getbase.com/v2/contacts",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: the probe is /v2/users/self, not /v2/accounts/self", () => {
  assertEquals(PROBE_PATH, "/v2/users/self");
});

Deno.test("oauth2: test passes when the probe answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 2, name: "Mark Johnson" }) }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  assert(calls[0].headers["user-agent"].length > 0, "User-Agent header missing");
});

Deno.test("oauth2: test fails with no access token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: a 401 is reported as a rejected/expired token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: a 403 is reported as an insufficient-scope refusal", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/scope/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect publishes name and email from /v2/users/self", async () => {
  const { ctx, calls } = mockCtx([
    { body: dataEnvelope({ id: 2, name: "Mark Johnson", email: "mark@example.com" }) },
  ]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(display, { name: "Mark Johnson", email: "mark@example.com" });
});

Deno.test("oauth2: afterConnect stays silent when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  assertEquals(await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx), {});
});

Deno.test("oauth2: declares the read/write/profile scopes and no PKCE", () => {
  assertEquals(oauth2.oauth2?.scopes, ["read", "write", "profile"]);
  assertEquals(oauth2.oauth2?.pkce, false);
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.getbase.com/oauth2/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.getbase.com/oauth2/token");
  assertEquals(oauth2.oauth2?.refreshUrl, "https://api.getbase.com/oauth2/token");
});
