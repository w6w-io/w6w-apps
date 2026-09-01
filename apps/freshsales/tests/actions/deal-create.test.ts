import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/deal-create.ts";

Deno.test("deal-create: POSTs to /deals, wrapped and unwrapped under `deal`", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deal: { id: 1, name: "Sample deal" } } }]);
  const out = await action.execute({ name: "Sample deal", amount: 23456, salesAccountId: 1 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/deals");
  assertEquals(calls[0].method, "POST");
  assertEquals(
    JSON.parse(calls[0].body!),
    { deal: { name: "Sample deal", amount: 23456, sales_account_id: 1 } },
  );
  assertEquals(out, { id: 1, name: "Sample deal" });
});

Deno.test("deal-create: drops unset optional fields", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { deal: {} } }]);
  await action.execute({ name: "Sample deal" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { deal: { name: "Sample deal" } });
});
