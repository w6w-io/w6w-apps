import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/account-update.ts";

Deno.test("account-update: PUTs to /sales_accounts/:id with only the set fields", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { sales_account: { id: 1 } } }]);
  const out = await action.execute({ accountId: 1, phone: "555-0100" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/sales_accounts/1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { sales_account: { phone: "555-0100" } });
  assertEquals(out, { id: 1 });
});

Deno.test("account-update: parses the customField JSON param", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { sales_account: {} } }]);
  await action.execute({ accountId: 1, customField: { cf_domain_name: "acme.com" } }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { sales_account: { custom_field: { cf_domain_name: "acme.com" } } },
  );
});
