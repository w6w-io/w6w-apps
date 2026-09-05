import { assert, assertEquals } from "@std/assert";
import apiKey, { PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

const KEY = "sk-unitTestFixtureNotARealKey0000000000000";
const WS = "ws_test123";

Deno.test("api-key: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://dust.tt/api/v1/w/ws_test123/spaces",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!({ request, credential: { apiKey: KEY } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, `Bearer ${KEY}`);
  assertEquals(signed.url, "https://dust.tt/api/v1/w/ws_test123/spaces");
});

Deno.test("api-key: the probe is /spaces", () => {
  assertEquals(PROBE_PATH, "/spaces");
});

Deno.test("api-key: test passes when /spaces answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { spaces: [] } }]);
  const result = await apiKey.test(
    { credential: { apiKey: KEY, workspaceId: WS, region: "us" } },
    ctx,
  );

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), `/api/v1/w/${WS}/spaces`);
  assertEquals(new URL(calls[0].url).host, "dust.tt");
  assertEquals(calls[0].headers.authorization, `Bearer ${KEY}`);
});

Deno.test("api-key: test resolves the EU host from the region field", async () => {
  const { ctx, calls } = mockCtx([{ body: { spaces: [] } }]);
  await apiKey.test({ credential: { apiKey: KEY, workspaceId: WS, region: "eu" } }, ctx);

  assertEquals(new URL(calls[0].url).host, "eu.dust.tt");
});

Deno.test("api-key: test fails with no key, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { workspaceId: WS } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails with no workspace id, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The three 401 shapes Dust distinguishes are three different problems, and
 * two of them (malformed vs. invalid) are otherwise indistinguishable from
 * the outside — verified live against dust.tt on 2026-09-05.
 */
Deno.test("api-key: a malformed-shape key is reported distinctly from a bad key", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody("malformed_authorization_header_error", "Malformed Authorization header"),
    },
  ]);
  const result = await apiKey.test(
    { credential: { apiKey: "not-a-dust-key", workspaceId: WS } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/should start with `sk-`/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: an unrecognised key names the other region as the next thing to try", async () => {
  const { ctx } = mockCtx([
    {
      status: 401,
      body: errorBody("invalid_api_key_error", "The API key provided is invalid or disabled."),
    },
  ]);
  const result = await apiKey.test(
    { credential: { apiKey: KEY, workspaceId: WS, region: "us" } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/invalid_api_key_error/.test(result.message ?? ""), result.message);
  assert(/EU region/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 404 is reported as no such workspace, not a bad key", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("workspace_not_found", "not found") }]);
  const result = await apiKey.test(
    { credential: { apiKey: KEY, workspaceId: WS, region: "us" } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/no workspace/i.test(result.message ?? ""), result.message);
});

Deno.test("api-key: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody("internal_server_error", "boom") }]);
  const result = await apiKey.test(
    { credential: { apiKey: KEY, workspaceId: WS, region: "us" } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect echoes workspace id, region and the space count", async () => {
  const { ctx, calls } = mockCtx([{ body: { spaces: [{ sId: "sp_1" }, { sId: "sp_2" }] } }]);
  const display = await apiKey.afterConnect!(
    { credential: { apiKey: KEY, workspaceId: WS, region: "eu" } },
    ctx,
  );

  assertEquals(display, { workspaceId: WS, region: "eu", spaceCount: 2 });
  assertEquals(new URL(calls[0].url).host, "eu.dust.tt");
});

Deno.test("api-key: afterConnect defaults the region to us when unset", async () => {
  const { ctx } = mockCtx([{ body: { spaces: [] } }]);
  const display = await apiKey.afterConnect!({ credential: { apiKey: KEY, workspaceId: WS } }, ctx);

  assertEquals(display, { workspaceId: WS, region: "us", spaceCount: 0 });
});

Deno.test("api-key: afterConnect stays silent when there is no workspace id", async () => {
  const { ctx } = mockCtx([]);
  assertEquals(await apiKey.afterConnect!({ credential: { apiKey: KEY } }, ctx), {});
});

Deno.test("api-key: afterConnect degrades to a bare echo when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid_api_key_error", "no") }]);
  const display = await apiKey.afterConnect!(
    { credential: { apiKey: KEY, workspaceId: WS, region: "us" } },
    ctx,
  );

  assertEquals(display, { workspaceId: WS, region: "us" });
});
