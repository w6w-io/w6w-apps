import { assert, assertEquals } from "@std/assert";
import testToken, { authHeaders } from "../../auth/test-token.ts";
import { BAD_TOKEN_BODY, mockCtx, pathOf, queryOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

const TOKEN = "11111111-2222-3333-4444-unitTestFixtureNotReal";

Deno.test("test-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.raindrop.io/rest/v1/collections",
    headers: {} as Record<string, string>,
  };
  const signed = testToken.sign!({ request, credential: { testToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  // Raindrop documents exactly one way to present a token — the header. The URL
  // is untouched, and a workflow host logs URLs.
  assertEquals(signed.url, "https://api.raindrop.io/rest/v1/collections");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("test-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ testToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("test-token: test passes when /user answers with a user", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: true, user: { _id: 32 } } }]);
  const result = await testToken.test({ credential: { testToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/rest/v1/user");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("test-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await testToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The two 401s Raindrop distinguishes only in the body have to reach the caller
 * as two different diagnoses. This is the same invariant `probe.test.ts` proves
 * on the pure function, asserted here through the real hook so that a future
 * refactor cannot quietly stop calling it.
 */
Deno.test("test-token: the two 401 bodies produce two different messages", async () => {
  const missing = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const rejected = mockCtx([{ status: 401, body: BAD_TOKEN_BODY }]);

  const a = await testToken.test({ credential: { testToken: TOKEN } }, missing.ctx);
  const b = await testToken.test({ credential: { testToken: TOKEN } }, rejected.ctx);

  assertEquals(a.ok, false);
  assertEquals(b.ok, false);
  assert(a.message !== b.message, "the two 401 cases were flattened into one message");
  assert(/test token/.test(b.message ?? ""), b.message);
});

/** No probe message may echo the credential it was handed. */
Deno.test("test-token: a failure message never contains the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: BAD_TOKEN_BODY }]);
  const result = await testToken.test({ credential: { testToken: TOKEN } }, ctx);

  assert(!(result.message ?? "").includes(TOKEN), result.message);
});

/**
 * `afterConnect` publishes the display name only. The account's email, config,
 * groups and linked-account flags come back on the same response and must not
 * reach the connection label, which is rendered in lists, logs and previews.
 */
Deno.test("test-token: afterConnect publishes the name and drops the email", async () => {
  const { ctx } = mockCtx([{
    body: {
      result: true,
      user: {
        _id: 32,
        fullName: "Mussabekov Rustem",
        email: "some@email.com",
        config: { lang: "ru_RU" },
        groups: [{ title: "My Collections" }],
      },
    },
  }]);
  const out = await testToken.afterConnect!({ credential: { testToken: TOKEN } }, ctx);

  assertEquals(out, { fullName: "Mussabekov Rustem", userId: 32 });
  assertEquals(JSON.stringify(out).includes("some@email.com"), false);
});

/** A missing label must not fail a Connection whose token `test` already passed. */
Deno.test("test-token: afterConnect is silent on failure", async () => {
  const failing = mockCtx([{ status: 500, body: { result: false } }]);
  assertEquals(
    await testToken.afterConnect!({ credential: { testToken: TOKEN } }, failing.ctx),
    {},
  );

  const nameless = mockCtx([{ body: { result: true, user: { _id: 1 } } }]);
  assertEquals(
    await testToken.afterConnect!({ credential: { testToken: TOKEN } }, nameless.ctx),
    {},
  );
});

Deno.test("test-token: the credential field is a secret and the token's limits are stated", () => {
  assertEquals(testToken.type, "bearer");
  const field = testToken.fields?.[0];
  assertEquals(field?.key, "testToken");
  assertEquals(field?.type, "secret");
  // Its two defining properties: never expires, acts as the app owner.
  assert(/does not expire/i.test(field?.hint ?? ""), field?.hint);
  assert(/app owner/i.test(field?.hint ?? ""), field?.hint);
});
