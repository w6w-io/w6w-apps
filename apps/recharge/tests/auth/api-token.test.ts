import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../../auth/api-token.ts";
import { envelope, mockCtx, pathOf, singleErrorBody } from "../_helpers.ts";

Deno.test("api-token: authHeaders stamps the raw token with no prefix", () => {
  assertEquals(authHeaders({ apiToken: "tok_123" }), { "x-recharge-access-token": "tok_123" });
});

Deno.test("api-token: sign() injects the header and never calls the network", async () => {
  const request = { headers: {} as Record<string, string>, url: "https://x", method: "GET" };
  const out = await apiToken.sign!(
    { request, credential: { apiToken: "tok_123" } },
    mockCtx().ctx,
  );
  assertEquals(out.headers["x-recharge-access-token"], "tok_123");
});

Deno.test("api-token: test() reports ok on a successful token_information call", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope("token_information", { name: "my token", scopes: ["read_customers"] }) },
  ]);
  const result = await apiToken.test({ credential: { apiToken: "tok_123" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(calls[0].headers["x-recharge-access-token"], "tok_123");
});

Deno.test("api-token: test() reports the vendor's own error message on a 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: singleErrorBody("bad authentication") }]);
  const result = await apiToken.test({ credential: { apiToken: "wrong" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("bad authentication"));
});

Deno.test("api-token: test() fails fast on a missing credential without any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiToken.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect() publishes only the token's name", async () => {
  const { ctx } = mockCtx([
    {
      body: envelope("token_information", {
        name: "[Private App] storefront",
        contact_email: "ops@store.example",
        scopes: ["read_customers", "write_subscriptions"],
      }),
    },
  ]);
  const label = await apiToken.afterConnect!({ credential: { apiToken: "tok_123" } }, ctx);
  assertEquals(label, { tokenName: "[Private App] storefront" });
});

Deno.test("api-token: afterConnect() is silent on failure rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const label = await apiToken.afterConnect!({ credential: { apiToken: "tok_123" } }, ctx);
  assertEquals(label, {});
});

Deno.test("api-token: the probe never sends a Bearer/Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("token_information", { name: "t" }) }]);
  await apiToken.test({ credential: { apiToken: "tok_123" } }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
