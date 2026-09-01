import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/view-get-many.ts";

Deno.test("view-get-many: GETs /contacts/filters for the contacts resource", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{
    body: { filters: [{ id: 4, name: "All Contacts" }] },
  }]);
  const out = await action.execute({ resource: "contacts" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/filters");
  assertEquals(out, { views: [{ id: 4, name: "All Contacts" }] });
});

Deno.test("view-get-many: routes accounts and deals to their own /filters path", async () => {
  const accounts = mockFreshsalesCtx([{ body: { filters: [] } }]);
  await action.execute({ resource: "sales_accounts" }, accounts.ctx);
  assertEquals(
    accounts.calls[0].url,
    "https://acme.myfreshworks.com/crm/sales/api/sales_accounts/filters",
  );

  const deals = mockFreshsalesCtx([{ body: { filters: [] } }]);
  await action.execute({ resource: "deals" }, deals.ctx);
  assertEquals(deals.calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/deals/filters");
});
