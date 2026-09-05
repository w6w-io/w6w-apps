import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { authFailureResponse, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const API_KEY_VALUE = "unitTestFixtureNotARealKey00000";
const APP_ID_VALUE = "2_AppID_unitTestFixture";

Deno.test("api-key: sign stamps both headers and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.ontraport.com/1/Contacts",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: API_KEY_VALUE, appId: APP_ID_VALUE } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers["api-key"], API_KEY_VALUE);
  assertEquals(signed.headers["api-appid"], APP_ID_VALUE);
  assertEquals(Object.keys(signed.headers).sort(), ["api-appid", "api-key"]);
  // Neither credential leaks into the URL.
  assertEquals(signed.url, "https://api.ontraport.com/1/Contacts");
  assert(!signed.url.includes(API_KEY_VALUE));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: API_KEY_VALUE, appId: APP_ID_VALUE }), {
    "api-key": API_KEY_VALUE,
    "api-appid": APP_ID_VALUE,
  });
});

Deno.test("api-key: the probe is Contacts/getInfo, which returns no contact data", () => {
  assertEquals(PROBE_PATH, "/Contacts/getInfo");
});

Deno.test("api-key: test passes when the probe answers the JSON envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ count: "3" }) }]);
  const result = await apiKey.test(
    { credential: { apiKey: API_KEY_VALUE, appId: APP_ID_VALUE } },
    ctx,
  );

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/1/Contacts/getInfo");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["api-key"], API_KEY_VALUE);
  assertEquals(calls[0].headers["api-appid"], APP_ID_VALUE);
});

Deno.test("api-key: test fails with no apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { appId: APP_ID_VALUE } }, ctx);
  assertEquals(result.ok, false);
  assert(/apiKey/.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails with no appId, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: API_KEY_VALUE } }, ctx);
  assertEquals(result.ok, false);
  assert(/appId/.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 0);
});

/**
 * The response this pack's own hard rule requires reading correctly: a bad
 * credential pair answers PLAIN TEXT, not the documented JSON envelope.
 */
Deno.test("api-key: a plain-text 401 auth failure is classified by body, not by status alone", async () => {
  const { ctx } = mockCtx([authFailureResponse()]);
  const result = await apiKey.test({ credential: { apiKey: "garbage", appId: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the app id/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a non-auth-failure non-2xx is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: "upstream exploded",
    headers: { "content-type": "text/plain" },
  }]);
  const result = await apiKey.test(
    { credential: { apiKey: API_KEY_VALUE, appId: APP_ID_VALUE } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 2xx body that is not the expected envelope is not treated as success", async () => {
  const { ctx } = mockCtx([{ body: { code: 1, data: {} } }]);
  const result = await apiKey.test(
    { credential: { apiKey: API_KEY_VALUE, appId: APP_ID_VALUE } },
    ctx,
  );
  assertEquals(result.ok, false);
});

Deno.test("api-key: an unreadable 2xx body is reported, not thrown", async () => {
  const { ctx } = mockCtx([{ body: "not json at all", headers: { "content-type": "text/plain" } }]);
  const result = await apiKey.test(
    { credential: { apiKey: API_KEY_VALUE, appId: APP_ID_VALUE } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/unreadable/i.test(result.message ?? ""), result.message);
});
