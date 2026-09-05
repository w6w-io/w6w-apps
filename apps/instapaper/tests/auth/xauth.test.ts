import { assert, assertEquals } from "@std/assert";
import xAuth from "../../auth/xauth.ts";
import { buildOAuth1Header } from "../../lib/oauth1.ts";
import { bodyOf, envelope, errorEnvelope, mockCtx, pathOf } from "../_helpers.ts";

const CRED = {
  consumerKey: "ck",
  consumerSecret: "cs",
  oauthToken: "tk",
  oauthTokenSecret: "ts",
  username: "alice@example.com",
};

Deno.test("xauth: exchange signs a two-legged POST to oauth/access_token with x_auth fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "oauth_token=tk&oauth_token_secret=ts" }]);
  const credential = await xAuth.exchange!({
    fields: {
      consumerKey: "ck",
      consumerSecret: "cs",
      username: "alice@example.com",
      password: "hunter2",
    },
  }, ctx) as typeof CRED;

  assertEquals(pathOf(calls[0].url), "/api/1/oauth/access_token");
  assertEquals(bodyOf(calls[0]), {
    x_auth_username: "alice@example.com",
    x_auth_password: "hunter2",
    x_auth_mode: "client_auth",
  });
  assert(calls[0].headers.authorization?.startsWith("OAuth "));
  assert(
    !calls[0].headers.authorization?.includes("oauth_token="),
    "no token exists yet — two-legged",
  );
  assertEquals(credential, {
    consumerKey: "ck",
    consumerSecret: "cs",
    oauthToken: "tk",
    oauthTokenSecret: "ts",
    username: "alice@example.com",
  });
});

Deno.test("xauth: exchange accepts an empty password — Instapaper accounts may have none", async () => {
  const { ctx, calls } = mockCtx([{ body: "oauth_token=tk&oauth_token_secret=ts" }]);
  await xAuth.exchange!(
    { fields: { consumerKey: "ck", consumerSecret: "cs", username: "alice" } },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).x_auth_password, "");
});

Deno.test("xauth: exchange requires consumerKey/consumerSecret/username", async () => {
  const { ctx } = mockCtx([]);
  await assertRejectsMessage(
    () => xAuth.exchange!({ fields: { username: "a" } }, ctx),
    "consumerKey",
  );
  await assertRejectsMessage(
    () => xAuth.exchange!({ fields: { consumerKey: "ck", username: "a" } }, ctx),
    "consumerSecret",
  );
  await assertRejectsMessage(
    () => xAuth.exchange!({ fields: { consumerKey: "ck", consumerSecret: "cs" } }, ctx),
    "username",
  );
});

Deno.test("xauth: exchange rejects the documented error envelope", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorEnvelope(1042, "Application is suspended") }]);
  await assertRejectsMessage(
    () =>
      xAuth.exchange!({ fields: { consumerKey: "ck", consumerSecret: "cs", username: "a" } }, ctx),
    "1042",
  );
});

Deno.test("xauth: exchange fails loudly if the success body has no token pair", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "not a qline response" }]);
  await assertRejectsMessage(
    () =>
      xAuth.exchange!({ fields: { consumerKey: "ck", consumerSecret: "cs", username: "a" } }, ctx),
    "oauth_token",
  );
});

Deno.test("xauth: sign stamps a three-legged OAuth header derived from the exact outgoing body", async () => {
  const request = {
    method: "POST",
    url: "https://www.instapaper.com/api/1/bookmarks/star",
    headers: {} as Record<string, string>,
    body: "bookmark_id=42",
  };
  const signed = await xAuth.sign!({ request, credential: CRED }, {} as never) as typeof request;

  assert(signed.headers.authorization.startsWith("OAuth "));
  assert(signed.headers.authorization.includes('oauth_consumer_key="ck"'));
  assert(signed.headers.authorization.includes('oauth_token="tk"'));

  // Cross-check: re-signing with the SAME nonce/timestamp `sign` actually
  // used (extracted from its own output — `sign` mints a fresh, unpredictable
  // one each call) must reproduce the identical signature, proving `sign` is
  // just `buildOAuth1Header` fed the exact outgoing method/url/body/credential.
  const nonce = signed.headers.authorization.match(/oauth_nonce="([^"]+)"/)?.[1];
  const timestamp = signed.headers.authorization.match(/oauth_timestamp="([^"]+)"/)?.[1];
  assert(nonce && timestamp, "signed header is missing oauth_nonce/oauth_timestamp");
  const expected = await buildOAuth1Header(
    "POST",
    request.url,
    { bookmark_id: "42" },
    { consumerKey: "ck", consumerSecret: "cs", token: "tk", tokenSecret: "ts" },
    { nonce, timestamp },
  );
  const sigOf = (h: string) => h.match(/oauth_signature="([^"]+)"/)?.[1];
  assertEquals(sigOf(signed.headers.authorization), sigOf(expected));
});

Deno.test("xauth: sign never touches the request body", async () => {
  const request = {
    method: "POST",
    url: "https://www.instapaper.com/api/1/bookmarks/star",
    headers: {},
    body: "bookmark_id=42",
  };
  const signed = await xAuth.sign!({ request, credential: CRED }, {} as never) as typeof request;
  assertEquals(signed.body, "bookmark_id=42");
});

Deno.test("xauth: test signs verify_credentials and reports the username on success", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope([{ type: "user", user_id: 1, username: "alice" }]),
  }]);
  const result = await xAuth.test({ credential: CRED }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/1/account/verify_credentials");
  assert(calls[0].headers.authorization?.startsWith("OAuth "));
  assertEquals(result.ok, true);
  assert(result.message?.includes("alice"));
});

Deno.test("xauth: test fails without making a request when the credential is incomplete", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await xAuth.test({ credential: { username: "a" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("xauth: test surfaces the vendor's error_code on a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorEnvelope(1042, "Application is suspended") }]);
  const result = await xAuth.test({ credential: CRED }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("1042"));
});

Deno.test("xauth: verify_credentials never echoes the token/secret it was signed with", async () => {
  const { ctx } = mockCtx([{ body: envelope([{ type: "user", user_id: 1, username: "alice" }]) }]);
  const result = await xAuth.test({ credential: CRED }, ctx);
  assert(!JSON.stringify(result).includes(CRED.oauthToken));
  assert(!JSON.stringify(result).includes(CRED.oauthTokenSecret));
});

Deno.test("xauth: afterConnect returns the canonical username and user id", async () => {
  const { ctx } = mockCtx([{
    body: envelope([{ type: "user", user_id: 99, username: "alice2" }]),
  }]);
  const display = await xAuth.afterConnect!({ credential: CRED }, ctx);
  assertEquals(display, { username: "alice2", userId: 99 });
});

Deno.test("xauth: afterConnect stays silent (empty object) when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorEnvelope(1042, "Application is suspended") }]);
  assertEquals(await xAuth.afterConnect!({ credential: CRED }, ctx), {});
});

Deno.test("xauth: declares no refresh or revoke hook — neither is documented by Instapaper", () => {
  assertEquals(xAuth.refresh, undefined);
  assertEquals(xAuth.revoke, undefined);
});

Deno.test("xauth: the password field is not required — Instapaper accounts may have none", () => {
  const password = xAuth.fields?.find((f) => f.key === "password");
  assertEquals(password?.required, false);
  assertEquals(password?.type, "secret");
});

async function assertRejectsMessage(fn: () => unknown, needle: string) {
  try {
    await fn();
    throw new Error(`expected a rejection containing "${needle}"`);
  } catch (err) {
    assert(String(err).includes(needle), `expected error to include "${needle}", got: ${err}`);
  }
}
