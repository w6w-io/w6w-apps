import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/account-get-many.ts";

Deno.test("account-get-many: GETs the view path under /sales_accounts", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{
    body: { sales_accounts: [{ id: 1 }], meta: { total: 1 } },
  }]);
  const out = await action.execute({ viewId: 2 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/sales_accounts/view/2");
  assertEquals(out, { accounts: [{ id: 1 }], total: 1 });
});

Deno.test("account-get-many: forwards page/perPage", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { sales_accounts: [], meta: { total: 0 } } }]);
  await action.execute({ viewId: 2, page: 3, perPage: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "3");
  assertEquals(url.searchParams.get("per_page"), "10");
});
