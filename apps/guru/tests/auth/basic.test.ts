import { assert, assertEquals } from "@std/assert";
import basic, { basicHeader, PROBE_PATH } from "../../auth/basic.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const USERNAME = "user@example.com";
const TOKEN = "guru-unit-test-fixture-not-a-real-token";

Deno.test("basic: sign stamps the Basic header from username:token", () => {
  const request = {
    method: "GET",
    url: "https://api.getguru.com/api/v1/whoami",
    headers: {} as Record<string, string>,
  };
  const signed = basic.sign!(
    { request, credential: { username: USERNAME, token: TOKEN } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers.authorization, `Basic ${btoa(`${USERNAME}:${TOKEN}`)}`);
  // The credential never appears in the URL — Guru documents no query-param form.
  assertEquals(signed.url, "https://api.getguru.com/api/v1/whoami");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("basic: basicHeader is the single source of the wire format", () => {
  assertEquals(
    basicHeader({ username: USERNAME, token: TOKEN }),
    `Basic ${btoa(`${USERNAME}:${TOKEN}`)}`,
  );
});

/**
 * The probe is pinned here. The authentication doc's own worked example tests
 * `/api/v1/teams`, which no longer exists in the current OpenAPI document —
 * see `auth/basic.ts` for the measurement. Someone "helpfully" following that
 * doc back to `/teams` is exactly the regression this guards.
 */
Deno.test("basic: the probe is /whoami, not the stale doc example /teams", () => {
  assertEquals(PROBE_PATH, "/whoami");
});

Deno.test("basic: test passes when whoami answers ok, without reading the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { tokenType: "API", team: {} } }]);
  const result = await basic.test({ credential: { username: USERNAME, token: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1/whoami");
  assertEquals(calls[0].headers.authorization, `Basic ${btoa(`${USERNAME}:${TOKEN}`)}`);
});

Deno.test("basic: test fails with no username or token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await basic.test({ credential: {} }, ctx)).ok, false);
  assertEquals((await basic.test({ credential: { username: USERNAME } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: a 401 is reported as a rejected credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: undefined }]);
  const result = await basic.test({ credential: { username: USERNAME, token: "wrong" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the credential/i.test(result.message ?? ""), result.message);
});

Deno.test("basic: an unexpected status is reported plainly", async () => {
  const { ctx } = mockCtx([{ status: 500, body: undefined }]);
  const result = await basic.test({ credential: { username: USERNAME, token: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("basic: has no afterConnect — the whoami body is not trusted enough to read", () => {
  assertEquals(basic.afterConnect, undefined);
});

Deno.test("basic: both credential fields are declared secret", () => {
  for (const f of basic.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
