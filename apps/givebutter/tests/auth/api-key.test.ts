import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { envelope, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const KEY = "gb_live_unitTestFixtureNotARealKey00000";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.givebutter.com/v1/campaigns",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://api.givebutter.com/v1/campaigns");
  assert(!signed.url.includes(KEY));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: KEY }), { authorization: `Bearer ${KEY}` });
});

/**
 * Pinned here, not just in the entry-module tests: this is the file someone
 * edits when they decide `/sso/v1/account` looks like a shorter whoami — it
 * is not reachable with a bearer API key (see module doc for the measured
 * 302 redirect).
 */
Deno.test("api-key: the probe is /campaigns, never an /sso/v1/* path", () => {
  assertEquals(PROBE_PATH, "/campaigns");
});

Deno.test("api-key: test passes when the campaigns list answers", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v1/campaigns");
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The wire shape actually observed — `{"error": {"message": "..."}}` — not
 * the flat `{"message": "..."}` every docs page shows.
 */
Deno.test("api-key: a 401 with the wire error shape is reported as a rejected key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Unauthorized") }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
  assert(/Unauthorized/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 403 is reported as a refusal, not as a bad key", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("This action is unauthorized.") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
});

/**
 * A 404 whose body is the marketing site's HTML (no `error`/`message` key at
 * all) must not crash `test` and must say so rather than printing "undefined".
 */
Deno.test("api-key: an unreadable body is reported as such, not as a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "<!DOCTYPE html>...Butter 404..." }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/unreadable body/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("upstream exploded") }]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});
