import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: sign stamps X-Phantombuster-Key", () => {
  const request = {
    method: "GET",
    url: "https://api.phantombuster.com/api/v2/agents/fetch-all",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "abc123" } },
    {} as never,
  ) as typeof request;
  assertEquals(signed.headers["x-phantombuster-key"], "abc123");
});

Deno.test("api-key: sign also stamps X-Phantombuster-Org when orgId is set", () => {
  const request = {
    method: "GET",
    url: "https://api.phantombuster.com/api/v2/agents/fetch-all",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "abc123", orgId: "org1" } },
    {} as never,
  ) as typeof request;
  assertEquals(signed.headers["x-phantombuster-org"], "org1");
});

Deno.test("api-key: sign omits X-Phantombuster-Org when no orgId is set", () => {
  const request = {
    method: "GET",
    url: "https://api.phantombuster.com/api/v2/agents/fetch-all",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "abc123" } },
    {} as never,
  ) as typeof request;
  assertEquals("x-phantombuster-org" in signed.headers, false);
});

Deno.test("api-key: test() probes /orgs/fetch-resources, not a whoami", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { dailyExecutionTime: 100 } }]);
  const result = await apiKey.test({ credential: { apiKey: "abc123" } }, ctx);

  assertEquals(calls[0].url, "https://api.phantombuster.com/api/v2/orgs/fetch-resources");
  assertEquals(calls[0].headers["x-phantombuster-key"], "abc123");
  assertEquals(result, { ok: true });
});

Deno.test("api-key: test() reports missing credential without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(calls.length, 0);
  assertEquals(result.ok, false);
});

Deno.test("api-key: test() surfaces the vendor's own error message on a 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { status: "error", error: "API key not found" } }]);
  const result = await apiKey.test({ credential: { apiKey: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("API key not found"));
});

/**
 * Pinned by the exact assignment, not a blanket text scan — `WHY_NOT_USERS_FETCH_ME`
 * is a real code string that *names* `/users/fetch-me` for documentation, and a
 * bare substring ban would flag that constant as if it were a live probe.
 */
Deno.test("api-key: PROBE_PATH is not pointed at the whoami", () => {
  assertEquals(PROBE_PATH, "/orgs/fetch-resources");
});

Deno.test("authHeaders: builds exactly the documented header names", () => {
  assertEquals(authHeaders({ apiKey: "k" }), { "x-phantombuster-key": "k" });
  assertEquals(authHeaders({ apiKey: "k", orgId: "o" }), {
    "x-phantombuster-key": "k",
    "x-phantombuster-org": "o",
  });
});

Deno.test("api-key: the credential field is declared secret, orgId is not", () => {
  const secretField = apiKey.fields?.find((f) => f.key === "apiKey");
  const orgField = apiKey.fields?.find((f) => f.key === "orgId");
  assertEquals(secretField?.type, "secret");
  assertEquals(orgField?.type, "string");
});
