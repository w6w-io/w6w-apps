import { assertEquals } from "@std/assert";
import adAccountGet from "../../actions/ad-account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ad-account-get: calls GET /ad_accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Acme Ads", currency: "USD" } }]);
  const out = await adAccountGet.execute({ adAccountId: "1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v5/ad_accounts/1");
  assertEquals(out.name, "Acme Ads");
});
