import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "ub_oauth_test_fixture_not_real";

Deno.test("oauth2: config matches the vendor's documented endpoints", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, "https://api.unbounce.com/oauth/authorize");
  assertEquals(oauth2.oauth2?.tokenUrl, "https://api.unbounce.com/oauth/token");
  assertEquals(oauth2.oauth2?.scopes, ["full"]);
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: sign stamps a bearer header", () => {
  const request = { method: "GET", url: "x", headers: {} as Record<string, string> };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test passes when /users/self answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", email: "a@b.com" } }]);
  const result = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/users/self");
});

Deno.test("oauth2: test fails with no access token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: a rejected token is reported", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const result = await oauth2.test({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect publishes only the email and user id", async () => {
  const { ctx } = mockCtx([{ body: { id: "1460053", email: "a@b.com" } }]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(display, { email: "a@b.com", userId: "1460053" });
});

Deno.test("oauth2: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  assertEquals(await oauth2.afterConnect!({ credential: { accessToken: TOKEN } }, ctx), {});
});
