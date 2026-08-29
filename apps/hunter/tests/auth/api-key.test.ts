import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares the api_key query-param wiring", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "query", name: "api_key" });
  for (const f of auth.fields ?? []) assertEquals(f.type, "secret", `${f.key} is not type secret`);
});

Deno.test("api-key: sign appends api_key to the query string, not a header", async () => {
  const request = {
    url: "https://api.hunter.io/v2/domain-search?domain=stripe.com",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "tok123" } }, mockCtx().ctx);
  assertEquals(queryOf(out.url).api_key, "tok123");
  assertEquals(out.headers["authorization"], undefined);
});

Deno.test("api-key: test hits GET /account and passes when data.email is present", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { email: "a@hunter.io" } } }]);
  const result = await auth.test({ credential: { apiKey: "tok123" } }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/account");
  assertEquals(queryOf(calls[0].url).api_key, "tok123");
  assertEquals(result.ok, true);
});

Deno.test("api-key: test fails on a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: [{ id: "unauthorized" }] } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
});

/**
 * A 200 with no account data is treated as a failure, not a pass — the
 * liveness check reads the BODY, not just the status code, per the house
 * rule against classifying credential validity from a status code alone.
 */
Deno.test("api-key: test fails on a 200 that carries no account data", async () => {
  const { ctx } = mockCtx([{ body: { data: {} } }]);
  const result = await auth.test({ credential: { apiKey: "tok" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: test fails cleanly when the credential is missing", async () => {
  const result = await auth.test({ credential: {} }, mockCtx().ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: afterConnect derives user + company labels from GET /account", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        data: {
          first_name: "Ada",
          last_name: "Lovelace",
          email: "ada@hunter.io",
          plan_name: "Growth",
        },
      },
    },
  ]);
  const meta = await auth.afterConnect!({ credential: { apiKey: "tok" } }, ctx);
  assertEquals((meta.user as { name: string }).name, "Ada Lovelace");
  assertEquals((meta.company as { plan: string }).plan, "Growth");
});
