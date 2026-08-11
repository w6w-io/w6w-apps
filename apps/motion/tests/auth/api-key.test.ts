import { assert, assertEquals } from "@std/assert";
import apiKey, { AUTH_HEADER, authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf, queryOf, UNAUTHORIZED_BODY } from "../_helpers.ts";

const KEY = "motion_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps X-API-Key and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.usemotion.com/v1/tasks",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers["x-api-key"], KEY);
  assertEquals(signed.headers.authorization, undefined);
  // The URL is untouched: Motion documents no query form for the key, and a
  // workflow host logs request URLs while it does not log headers.
  assertEquals(signed.url, "https://api.usemotion.com/v1/tasks");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(AUTH_HEADER, "x-api-key");
  assertEquals(authHeaders({ apiKey: KEY }), { "x-api-key": KEY });
});

/**
 * Pinned here as well as in the entry-module tests, because this is the file
 * someone edits. Motion's whoami is safe (`{id, name, email}`) where Mailjet's
 * `/apikey` and Follow Up Boss's `/me` are not, and that was established by
 * reading the response schema rather than by the endpoint's name.
 */
Deno.test("api-key: the probe is /v1/users/me", () => {
  assertEquals(PROBE_PATH, "/v1/users/me");
});

Deno.test("api-key: test passes when the whoami returns a user object", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", name: "Ada", email: "ada@example.com" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/users/me");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["x-api-key"], KEY);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * A 200 that is not a user object means something is answering for Motion that
 * is not Motion — a captive portal, a proxy, a rebuilt route. Passing on the
 * status code alone would call that a live credential.
 */
Deno.test("api-key: a 200 with the wrong shape is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/not a user object/i.test(result.message ?? ""), result.message);
});

/**
 * The finding this hook is built around: Motion returns a byte-identical 401 for
 * a missing key, an empty key, a wrong key and a wrong header name. So the
 * message must name the possibilities rather than assert a cause — telling
 * someone their key is invalid when the real fault was that it never attached
 * sends them to regenerate a perfectly good key.
 */
Deno.test("api-key: a 401 is reported as undiagnosable, not as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  const message = result.message ?? "";
  for (const cause of ["missing", "empty", "revoked", "wrong header name"]) {
    assert(message.includes(cause), `the 401 message does not mention "${cause}": ${message}`);
  }
});

/** Every cause produces the same message, because Motion gives nothing to tell them apart. */
Deno.test("api-key: the 401 wording does not vary with the key that produced it", async () => {
  const first = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const second = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  const a = await apiKey.test({ credential: { apiKey: "one" } }, first.ctx);
  const b = await apiKey.test({ credential: { apiKey: "two" } }, second.ctx);

  assertEquals(a.message, b.message);
  // And the key itself never appears in what a user is shown.
  assert(!(a.message ?? "").includes("one"));
});

/**
 * A throttle is not a verdict on the credential. Motion allows 12 requests a
 * minute on the individual tier, which a workflow reaches easily, and reporting
 * that as "your key is invalid" would break a working Connection.
 */
Deno.test("api-key: a 429 is reported as a rate limit, not a credential failure", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { message: "Too Many Requests" } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/rate limit/i.test(result.message ?? ""), result.message);
  assert(/12 requests\/minute/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

/**
 * `afterConnect` publishes the user id — the value `assigneeId` takes, and one
 * that appears nowhere in the Motion UI — and the name. The account's email is
 * dropped: connection display data is rendered in shared UI and copied into run
 * records, and the name already makes the Connection readable.
 */
Deno.test("api-key: afterConnect publishes the user id and name, and drops the email", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "u1", name: "Ada", email: "ada@example.com" } },
  ]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/users/me");
  assertEquals(display, { userId: "u1", name: "Ada" });
  assert(!JSON.stringify(display).includes("ada@example.com"));
  assert(!JSON.stringify(display).includes(KEY));
});

Deno.test("api-key: afterConnect stays silent when the whoami fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: UNAUTHORIZED_BODY }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: afterConnect publishes only what the response carried", async () => {
  const { ctx } = mockCtx([{ body: { id: "u1", email: "ada@example.com" } }]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), { userId: "u1" });
});
