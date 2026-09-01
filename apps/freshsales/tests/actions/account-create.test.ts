import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/account-create.ts";

Deno.test("account-create: POSTs to /sales_accounts, wrapped under `sales_account`", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{
    body: { sales_account: { id: 1, name: "Widgetz" } },
  }]);
  const out = await action.execute({ name: "Widgetz" }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/sales_accounts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { sales_account: { name: "Widgetz" } });
  assertEquals(out, { id: 1, name: "Widgetz" });
});

Deno.test("account-create: passes through numeric size fields", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { sales_account: {} } }]);
  await action.execute({ name: "Widgetz", numberOfEmployees: 50, annualRevenue: 1000000 }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!),
    { sales_account: { name: "Widgetz", number_of_employees: 50, annual_revenue: 1000000 } },
  );
});
