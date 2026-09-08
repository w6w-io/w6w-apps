import { assert, assertEquals } from "@std/assert";
import bearerToken, { authHeaders, PROBE_PATH } from "../../auth/bearer-token.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bearer-token: probes /v3/profile", () => {
  assertEquals(PROBE_PATH, "/v3/profile");
});

Deno.test("bearer-token: sign stamps a Bearer authorization header", () => {
  const request = {
    method: "GET",
    url: "https://api.feedly.com/v3/streams/contents?streamId=x",
    headers: {} as Record<string, string>,
  };
  const signed = bearerToken.sign!(
    { request, credential: { apiToken: "fe_abc123" } },
    {} as never,
  ) as typeof request;
  assertEquals(signed.headers.authorization, "Bearer fe_abc123");
  assertEquals(signed.url, request.url);
});

Deno.test("authHeaders: builds the same header sign() and test() both use", () => {
  assertEquals(authHeaders({ apiToken: "tok" }), { authorization: "Bearer tok" });
});

Deno.test("bearer-token: test() succeeds on a 2xx", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await bearerToken.test({ credential: { apiToken: "fe_good" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/v3/profile");
  assertEquals(calls[0].headers["authorization"], "Bearer fe_good");
});

Deno.test("bearer-token: test() reports a missing token without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await bearerToken.test({ credential: { apiToken: "" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test('bearer-token: test() distinguishes "no token reached" from "bad token"', async () => {
  const { ctx: noneCtx } = mockCtx([
    { status: 401, body: errorBody(401, "must provide authorization token") },
  ]);
  const none = await bearerToken.test({ credential: { apiToken: "x" } }, noneCtx);
  assert(!none.ok);
  assert(/did not reach the request/.test(none.message ?? ""), none.message);

  const { ctx: badCtx } = mockCtx([{ status: 401, body: errorBody(401, "invalid token") }]);
  const bad = await bearerToken.test({ credential: { apiToken: "x" } }, badCtx);
  assert(!bad.ok);
  assert(/rejected the token/.test(bad.message ?? ""), bad.message);
});

Deno.test("bearer-token: test() surfaces an unexpected status via the shared formatter", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  const result = await bearerToken.test({ credential: { apiToken: "x" } }, ctx);
  assert(!result.ok);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("bearer-token: the credential field is type secret", () => {
  for (const f of bearerToken.fields ?? []) {
    assertEquals(f.type, "secret", `${f.key}: not type "secret"`);
  }
});

Deno.test("bearer-token: sign never calls ctx.fetch — network-less by contract", async () => {
  const src = await Deno.readTextFile(new URL("../../auth/bearer-token.ts", import.meta.url));
  const signBody = src.slice(src.indexOf("sign({"), src.indexOf("async test("));
  assert(!/ctx\.fetch/.test(signBody), "sign() must not touch the network");
});
