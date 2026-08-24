import { assert, assertEquals } from "@std/assert";
import apiKey from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const KEY = "b44_unitTestFixtureNotARealKey00000";
const WORKSPACE = "wksp-abc123";

Deno.test("api-key: sign stamps the api_key header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://app.base44.com/api/v1/monitoring/health",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: KEY, workspaceId: WORKSPACE } },
    {} as never,
  ) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.api_key, KEY);
  assertEquals(signed.headers.authorization, undefined);
  assertEquals(signed.url, "https://app.base44.com/api/v1/monitoring/health");
});

Deno.test("api-key: test fails fast with no workspaceId, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: KEY } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test fails fast with no apiKey, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { workspaceId: WORKSPACE } }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test succeeds when the Monitoring API answers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { summary: {} } }]);
  const result = await apiKey.test({ credential: { apiKey: KEY, workspaceId: WORKSPACE } }, ctx);

  assertEquals(result.ok, true);
  assert(/Monitoring API/.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), `/api/v1/monitoring/analytics/${WORKSPACE}`);
  assertEquals(calls[0].headers.api_key, KEY);
});

/**
 * A workspace key scoped only to `audit_logs:read` (or a personal key trying
 * the Audit Logs API) legitimately 401s/403s on the Monitoring API. That
 * must not fail the connection when the Audit Logs API accepts the same key.
 */
Deno.test("api-key: test falls back to the Audit Logs API when Monitoring rejects the key", async () => {
  const { ctx, calls } = mockCtx([
    { status: 403, body: "" },
    { status: 200, body: { events: [], pagination: { total: 0 } } },
  ]);
  const result = await apiKey.test({ credential: { apiKey: KEY, workspaceId: WORKSPACE } }, ctx);

  assertEquals(result.ok, true);
  assert(/Audit Logs API/.test(result.message ?? ""), result.message);
  assertEquals(calls.length, 2);
  assertEquals(pathOf(calls[1].url), `/api/v1/audit-logs/${WORKSPACE}/list`);
  assertEquals(calls[1].method, "POST");
});

Deno.test("api-key: test fails when both surfaces reject the key", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: "" },
    { status: 401, body: "" },
  ]);
  const result = await apiKey.test(
    { credential: { apiKey: "garbage", workspaceId: WORKSPACE } },
    ctx,
  );

  assertEquals(result.ok, false);
  assert(/Monitoring API/.test(result.message ?? ""), result.message);
  assert(/Audit Logs API/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: afterConnect echoes only the workspace id, never the key", () => {
  const display = apiKey.afterConnect!(
    { credential: { apiKey: KEY, workspaceId: WORKSPACE } },
    {} as never,
  );
  assertEquals(display, { workspaceId: WORKSPACE });
});
