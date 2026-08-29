import { assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeaders: builds the bearer header", () => {
  assertEquals(authHeaders({ apiKey: "abc" }), { authorization: "Bearer abc" });
});

Deno.test("authHeaders: an absent key still produces a header, never throws", () => {
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("sign: stamps the bearer header and returns the request", () => {
  const request = {
    headers: {} as Record<string, string>,
    url: "https://dialpad.com/api/v2/offices",
  };
  const out = apiKey.sign!({ request, credential: { apiKey: "secret-key" } } as never, {} as never);
  assertEquals((out as typeof request).headers["authorization"], "Bearer secret-key");
});

Deno.test("test: probes the documented path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { cursor: null, items: [] } }]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), `/api/v2${PROBE_PATH}`);
  assertEquals(calls[0].headers["authorization"], "Bearer k");
});

Deno.test("test: an empty credential fails before any request is made", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: a 401 reports Dialpad's can't-distinguish-missing-from-wrong caveat", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody(401, "A valid API key must be provided.") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("does not distinguish"), true);
});

Deno.test("test: a non-401 failure surfaces Dialpad's own error message", async () => {
  const { ctx } = mockCtx([
    { status: 500, body: errorBody(500, "internal error") },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message?.includes("internal error"), true);
});

/**
 * The probe is pinned by path. `GET /api/v2/company` is the obvious
 * alternative and is wrong: the spec tags it `x-access: admin`, so a
 * perfectly good user-level key would fail it.
 */
Deno.test("index: the auth probe is /offices, not /company", () => {
  assertEquals(PROBE_PATH, "/offices");
});

Deno.test("the credential field is declared secret", () => {
  for (const f of apiKey.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiKey.test, "function");
  assertEquals(typeof apiKey.sign, "function");
});
