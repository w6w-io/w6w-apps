import { assertEquals } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { API_ROOT, APP_ID, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("authHeaders: builds the Key-prefixed header, never Bearer", () => {
  assertEquals(authHeaders({ apiKey: "os_v2_app_abc" }), { authorization: "Key os_v2_app_abc" });
});

Deno.test("sign: stamps the Authorization header and returns the request unchanged otherwise", () => {
  const request: SignableRequest = {
    url: "https://api.onesignal.com/apps/x/segments",
    method: "GET",
    headers: {},
  };
  const out = apiKey.sign!(
    { request, credential: { appId: APP_ID, apiKey: "os_v2_app_abc" } },
    mockCtx().ctx,
  ) as SignableRequest;
  assertEquals(out.headers["authorization"], "Key os_v2_app_abc");
  assertEquals(out.url, request.url);
});

Deno.test("test: missing appId fails without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await apiKey.test({ credential: { apiKey: "os_v2_app_abc" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: missing apiKey fails without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await apiKey.test({ credential: { appId: APP_ID } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: 200 on /apps/{id}/segments -> ok, and probes the right URL", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { segments: [], total_count: 0 } }]);
  const result = await apiKey.test({ credential: { appId: APP_ID, apiKey: "os_v2_app_abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/segments`);
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["authorization"], "Key os_v2_app_abc");
});

Deno.test("test: 401 -> not ok, message notes the vendor cannot distinguish missing vs wrong", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("Access denied. Please include an 'Authorization: ...' header ..."),
  }]);
  const result = await apiKey.test(
    { credential: { appId: APP_ID, apiKey: "wrong" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("401"), true);
});

Deno.test("test: 403 -> not ok, surfaces the vendor's own error text", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("journey-not-entitled") }]);
  const result = await apiKey.test({ credential: { appId: APP_ID, apiKey: "x" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("journey-not-entitled"), true);
});

Deno.test("test: 404 -> not ok, names the missing app", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("not found") }]);
  const result = await apiKey.test({ credential: { appId: APP_ID, apiKey: "x" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes(APP_ID), true);
});

Deno.test("afterConnect: echoes back the typed appId, no network call", async () => {
  const { calls } = mockCtx();
  const display = await apiKey.afterConnect!(
    { credential: { appId: APP_ID, apiKey: "os_v2_app_abc" } },
    mockCtx().ctx,
  );
  assertEquals(display, { appId: APP_ID });
  assertEquals(calls.length, 0);
});

// Sanity: the probe URL is always under the real API root.
Deno.test("test: probe host is api.onesignal.com", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { segments: [] } }]);
  await apiKey.test({ credential: { appId: APP_ID, apiKey: "os_v2_app_abc" } }, ctx);
  assertEquals(calls[0].url.startsWith(API_ROOT), true);
});
