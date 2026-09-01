import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/deal-get-many.ts";

Deno.test("deal-get-many: GETs the view path under /deals", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deals: [{ id: 1 }], meta: { total: 1 } } }]);
  const out = await action.execute({ viewId: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/deals/view/1");
  assertEquals(out, { deals: [{ id: 1 }], total: 1 });
});

Deno.test("deal-get-many: forwards page/perPage", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deals: [], meta: { total: 0 } } }]);
  await action.execute({ viewId: 1, page: 2, perPage: 40 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "40");
});
