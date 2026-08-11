import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "apify_api_unitTestFixtureNotARealToken00000";

Deno.test("api-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.apify.com/v2/actors",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  // The URL is untouched: Apify also accepts `?token=`, and this app never uses
  // it, because a workflow host logs request URLs and does not log headers.
  assertEquals(signed.url, "https://api.apify.com/v2/actors");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

/**
 * The probe is pinned here as well as in the entry-module tests, because this is
 * the file someone edits when they decide `/users/me` is shorter — and
 * `/users/me` returns the account's Apify Proxy password.
 */
Deno.test("api-token: the probe is /users/me/limits, not the whoami", () => {
  assertEquals(PROBE_PATH, "/users/me/limits");
});

Deno.test("api-token: test passes when the limits endpoint answers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ limits: {}, current: {} }) }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/users/me/limits");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The three 4xx codes Apify distinguishes are three different problems with
 * three different fixes, and all three arrive as a bare 401/403 without the
 * `type`. Collapsing them is how "the token is scoped away from this resource"
 * gets misreported as "your token expired".
 */
Deno.test("api-token: an invalid token is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody(
        "user-or-token-not-found",
        "User was not found or authentication token is not valid",
      ),
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a missing token is reported as never having arrived", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("token-not-provided", "Authentication token was not provided") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/received no token/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 403 is reported as a refusal, not as a bad token", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody(
        "insufficient-permissions",
        "You do not have permission to perform this action.",
      ),
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
  assert(/insufficient-permissions/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

/**
 * `afterConnect` is the one place this app calls the leaky whoami. It must keep
 * the username and drop everything else — most of all `proxy`.
 */
Deno.test("api-token: afterConnect publishes only the username and user id", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: "u1",
        username: "acme",
        email: "ops@acme.example",
        plan: { id: "PERSONAL" },
        proxy: { password: "proxy-password-do-not-leak", groups: [] },
      }),
    },
  ]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  assertEquals(display, { username: "acme", userId: "u1" });
  assert(!JSON.stringify(display).includes("proxy-password-do-not-leak"));
  assert(!JSON.stringify(display).includes("ops@acme.example"));
});

Deno.test("api-token: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("insufficient-permissions", "no") }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});

Deno.test("api-token: afterConnect stays silent when the response carries no username", async () => {
  const { ctx } = mockCtx([{ body: envelope({ id: "u1" }) }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});
