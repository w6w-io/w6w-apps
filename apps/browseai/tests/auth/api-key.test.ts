import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: sign stamps Authorization: Bearer <key>", async () => {
  const request = { url: "https://api.browse.ai/v2/robots", method: "GET", headers: {} };
  const { ctx } = mockCtx([]); // sign is network-less — an unqueued fetch would throw
  const out = await apiKey.sign!({ request, credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer sk_live_123");
});

Deno.test("authHeaders: builds the exact header sign() sends — the one place the wire format lives", () => {
  assertEquals(authHeaders({ apiKey: "sk_live_123" }), { authorization: "Bearer sk_live_123" });
});

Deno.test("api-key: test() reports ok on a 200 from the probe path", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { statusCode: 200, messageCode: "success", tasksQueueStatus: "OK" },
  }]);
  const out = await apiKey.test({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(pathOf(calls[0].url), `/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer sk_live_123");
  assertEquals(out, { ok: true });
});

Deno.test("api-key: test() fails locally, with no request, when the credential is empty", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Browse AI collapses "no key" and "wrong key" into the same 401 body — this
 * app cannot claim to tell them apart, so the message says so rather than
 * guessing.
 */
Deno.test("api-key: test() reports a generic 401 without pretending to know missing vs invalid", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { statusCode: 401, messageCode: "unauthorized" },
  }]);
  const out = await apiKey.test({ credential: { apiKey: "wrong" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("does not distinguish"));
});

Deno.test("api-key: test() calls out no_api_access as a plan problem, not a bad key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { statusCode: 401, messageCode: "no_api_access" },
  }]);
  const out = await apiKey.test({ credential: { apiKey: "sk_live_123" } }, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("API access"));
});

Deno.test("api-key: declares the credential field as type secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
});
