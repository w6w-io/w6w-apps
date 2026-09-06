import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "glide_api_unitTestFixtureNotARealToken00000";

Deno.test("api-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.glideapps.com/tables",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.glideapps.com/tables");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-token: the probe is GET /tables", () => {
  assertEquals(PROBE_PATH, "/tables");
});

Deno.test("api-token: test passes when /tables answers with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: "t1", name: "Invoices" }]) }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/tables");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The one fact this API's own errors page insists on: an invalid or unknown
 * token answers 404, never 401 — and this must be classified by the response
 * BODY (`error.type === "request_error"`), not by that status code.
 */
Deno.test("api-token: an invalid token — answered as 404 — is reported as a rejected token", async () => {
  const { ctx } = mockCtx([
    {
      status: 404,
      body: errorBody("request_error", "API key not found, or duplicate IN****ID"),
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API auth token/i.test(result.message ?? ""), result.message);
  assert(/API key not found/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: an unrecognised error type is reported as an HTTP failure, not silently treated as a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: test fails when /tables answers 200 with an unexpected shape", async () => {
  const { ctx } = mockCtx([{ body: { notData: true } }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/unexpected response shape/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: afterConnect publishes only a table count", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope([{ id: "t1", name: "Invoices" }, { id: "t2", name: "Contacts" }]) },
  ]);
  const display = await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables");
  assertEquals(display, { tableCount: 2 });
});

Deno.test("api-token: afterConnect stays silent when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("request_error", "no") }]);
  assertEquals(await apiToken.afterConnect!({ credential: { apiToken: TOKEN } }, ctx), {});
});
