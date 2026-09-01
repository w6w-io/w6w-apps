import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/deal-get.ts";

Deno.test("deal-get: GETs /deals/:id and unwraps `deal`", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deal: { id: 9, name: "Sample deal" } } }]);
  const out = await action.execute({ dealId: 9 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/deals/9");
  assertEquals(out, { id: 9, name: "Sample deal" });
});

Deno.test("deal-get: joins include into a comma-separated query param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deal: {} } }]);
  await action.execute({ dealId: 9, include: ["sales_account", "deal_stage"] }, ctx);
  assertEquals(
    calls[0].url,
    "https://acme.myfreshworks.com/crm/sales/api/deals/9?include=sales_account%2Cdeal_stage",
  );
});
