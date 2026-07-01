import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { API_REVISION } from "../../lib/client.ts";

Deno.test("api-key: is a custom auth method exposing an `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "custom");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign sets `Klaviyo-API-Key` scheme (NOT Bearer)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://a.klaviyo.com/api/profiles/",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "pk_test_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Klaviyo-API-Key pk_test_abc");
});

Deno.test("api-key: test hits /accounts/ with revision header and reports ok on data[0]", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "acc-1" }] } }]);
  const result = await auth.test({ credential: { apiKey: "pk_test_abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/accounts/");
  assertEquals(calls[0].headers["authorization"], "Klaviyo-API-Key pk_test_abc");
  assertEquals(calls[0].headers["revision"], API_REVISION);
});

Deno.test("api-key: test returns ok=false when data is empty", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await auth.test({ credential: { apiKey: "pk_x" } }, ctx);
  assertEquals(result.ok, false);
});
