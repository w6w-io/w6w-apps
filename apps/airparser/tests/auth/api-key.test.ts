import { assertEquals } from "@std/assert";
import apiKey, { authHeaders } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("api-key: authHeaders builds the X-API-Key header", () => {
  assertEquals(authHeaders({ apiKey: "sk_123" }), { "x-api-key": "sk_123" });
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("api-key: sign stamps X-API-Key onto the request", async () => {
  const request = {
    url: "https://api.airparser.com/inboxes",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiKey.sign!({ request, credential: { apiKey: "sk_live_1" } }, {} as never);
  assertEquals(out.headers["x-api-key"], "sk_live_1");
});

Deno.test("api-key: test fails fast on an empty credential without any fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(result, { ok: false, message: "credential missing apiKey" });
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes GET /inboxes with the key attached", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  const result = await apiKey.test({ credential: { apiKey: "sk_live_1" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/inboxes");
  assertEquals(calls[0].headers["x-api-key"], "sk_live_1");
});

Deno.test("api-key: test reports 401 without claiming to know missing vs wrong", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(401, "Unauthorized") }]);
  const result = await apiKey.test({ credential: { apiKey: "sk_wrong" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("401"), true);
  // The whole point of this hook: it must say the two cases are indistinguishable,
  // not assert a diagnosis ("your key is missing") the wire cannot support.
  assertEquals(/could be either/i.test(result.message ?? ""), true);
  assertEquals(/\bthe key is (missing|wrong)\b/i.test(result.message ?? ""), false);
});

Deno.test("api-key: test surfaces the vendor's own message for a non-401 failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: errorBody(500, "Internal Server Error") }]);
  const result = await apiKey.test({ credential: { apiKey: "sk_live_1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(
    result.message,
    "Airparser returned HTTP 500 for GET /inboxes: Internal Server Error",
  );
});

Deno.test("api-key: declares exactly one secret field and the required hooks", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey?.name, "X-API-Key");
  assertEquals(apiKey.apiKey?.in, "header");
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
