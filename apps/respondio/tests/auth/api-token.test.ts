import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { errorBody, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const TOKEN = "respondio_unit_test_fixture_token_not_real";

Deno.test("api-token: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.respond.io/v2/space/user",
    headers: {} as Record<string, string>,
  };
  const signed = apiToken.sign!({ request, credential: { apiToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(signed.url, "https://api.respond.io/v2/space/user");
  assert(!signed.url.includes(TOKEN));
});

/**
 * The bearer header is stamped even for an empty credential — never omitted —
 * because a request without an `Authorization: Bearer ...`-shaped header is
 * blocked at the CloudFront edge before it ever reaches respond.io. See the
 * module doc's table.
 */
Deno.test("api-token: sign always emits the Bearer prefix, even for an empty credential", () => {
  const request = { method: "GET", url: "x", headers: {} as Record<string, string> };
  const signed = apiToken.sign!({ request, credential: {} }, {} as never) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer ");
});

Deno.test("api-token: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiToken: TOKEN }), { authorization: `Bearer ${TOKEN}` });
});

Deno.test("api-token: the probe is /space/user, the same one respond.io's own mcp-server uses", () => {
  assertEquals(PROBE_PATH, "/space/user");
});

Deno.test("api-token: test passes when the workspace-users read answers", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1, firstName: "A" }]) }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/space/user");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("api-token: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: an invalid token is reported as a rejected token, from the JSON body", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "AuthorizationError", "Token not found") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the token/i.test(result.message ?? ""), result.message);
  assert(/AuthorizationError/.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 403 is reported as a refusal", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody(403, "ForbiddenError", "insufficient scope") },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused/i.test(result.message ?? ""), result.message);
});

Deno.test("api-token: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody(500, "ServerError", "boom") }]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

/**
 * The CloudFront edge quirk: a non-JSON body must be reported as an edge
 * block, never mistaken for a respond.io auth verdict — see `lib/client.ts`
 * and this file's module doc.
 */
Deno.test("api-token: a non-JSON response is reported as an edge block, not an auth verdict", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      headers: { "content-type": "text/html" },
      body: "<HTML><H1>403 ERROR</H1>Request blocked.</HTML>",
    },
  ]);
  const result = await apiToken.test({ credential: { apiToken: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/blocked before reaching the API/i.test(result.message ?? ""), result.message);
});
