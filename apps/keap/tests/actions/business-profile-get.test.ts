import { assertEquals } from "@std/assert";
import businessProfileGet from "../../actions/business-profile-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("business-profile-get: reads the v2 business profile, not the v1 account profile", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Acme", currency_code: "USD" } }]);
  const out = await businessProfileGet.execute({}, ctx) as { currency_code: string };
  assertEquals(pathOf(calls[0].url), "/crm/rest/v2/businessProfile");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.currency_code, "USD");
});

Deno.test("business-profile-get: takes no parameters and sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await businessProfileGet.execute({}, ctx);
  assertEquals(businessProfileGet.params, []);
  assertEquals(queryOf(calls[0].url), {});
});
