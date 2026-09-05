import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { errorBody, mockCtx, okBody, pathOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealApiKey0000000000";

Deno.test("api-key: sign stamps x-manus-api-key and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.manus.ai/v2/task.list",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: TOKEN } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };

  assertEquals(signed.headers["x-manus-api-key"], TOKEN);
  assertEquals(Object.keys(signed.headers), ["x-manus-api-key"]);
  assertEquals(signed.url, "https://api.manus.ai/v2/task.list");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("api-key: authHeaders is the single source of the wire format", () => {
  assertEquals(authHeaders({ apiKey: TOKEN }), { "x-manus-api-key": TOKEN });
  assertEquals(authHeaders({}), {});
});

Deno.test("api-key: test passes when usage.availableCredits answers ok", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: { total_credits: 100 } }) }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/usage.availableCredits");
  assertEquals(calls[0].headers["x-manus-api-key"], TOKEN);
});

Deno.test("api-key: test fails with no apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a rejected key is reported as such, not as a generic failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthenticated", "invalid api key") }]);
  const result = await apiKey.test({ credential: { apiKey: "garbage" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the API key/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: test does not echo the credential back in its message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("unauthenticated", "invalid api key") }]);
  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);
  assert(!result.message?.includes(TOKEN));
});
