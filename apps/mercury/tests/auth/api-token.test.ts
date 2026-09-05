import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { mercuryErrorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("authHeaders: builds the Bearer header verbatim, no prefix mangling", () => {
  assertEquals(
    authHeaders({ apiToken: "secret-token:mercury_production_wma_abc" }),
    { authorization: "Bearer secret-token:mercury_production_wma_abc" },
  );
});

Deno.test("sign: stamps the Authorization header and returns the request", () => {
  const request = {
    url: "https://api.mercury.com/api/v1/accounts",
    headers: {} as Record<string, string>,
  };
  const out = apiToken.sign!(
    { request, credential: { apiToken: "secret-token:abc" } } as never,
    {} as never,
  ) as { headers: Record<string, string> };
  assertEquals(out.headers["authorization"], "Bearer secret-token:abc");
});

Deno.test("test: an empty credential fails without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test!({ credential: { apiToken: "" } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("test: probes the documented PROBE_PATH, GET /categories?limit=1", async () => {
  const { ctx, calls } = mockCtx([{ body: { categories: [], page: {} } }]);
  await apiToken.test!({ credential: { apiToken: "secret-token:abc" } } as never, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/categories");
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer secret-token:abc");
});

Deno.test("test: a live 200 reports ok", async () => {
  const { ctx } = mockCtx([{ body: { categories: [], page: {} } }]);
  const result = await apiToken.test!(
    { credential: { apiToken: "secret-token:abc" } } as never,
    ctx,
  );
  assertEquals(result.ok, true);
});

Deno.test("test: noAuthTokenHeader reports the credential never reached the request", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: mercuryErrorBody("noAuthTokenHeader", "No Authorization header present") },
  ]);
  const result = await apiToken.test!(
    { credential: { apiToken: "secret-token:abc" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("reconnect"), result.message);
});

Deno.test("test: noTokenInDB reports a rejected/revoked token", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: mercuryErrorBody("noTokenInDB", "No matching token found") },
  ]);
  const result = await apiToken.test!(
    { credential: { apiToken: "secret-token:bad" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("noTokenInDB"), result.message);
});

Deno.test("test: an unrecognised non-2xx falls back to formatMercuryError", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await apiToken.test!(
    { credential: { apiToken: "secret-token:abc" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(result.message?.includes("Mercury 500"), result.message);
});

Deno.test("index: the credential field is declared secret, test and sign are present", () => {
  assertEquals(apiToken.key, "api-token");
  assertEquals(apiToken.type, "bearer");
  for (const f of apiToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: credential field is not type "secret"`);
  }
  assertEquals(typeof apiToken.test, "function");
  assertEquals(typeof apiToken.sign, "function");
});

Deno.test("PROBE_PATH: is /categories, never an account/organization read", () => {
  assertEquals(PROBE_PATH, "/categories?limit=1");
});
