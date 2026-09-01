import { assertEquals } from "@std/assert";
import invoiceList from "../../actions/invoice-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-list: lists /invoices filtered by subscriptionId", async () => {
  const { ctx, calls } = mockCtx([{ body: collection([{ id: "inv_1" }]) }]);
  await invoiceList.execute({ subscriptionId: "sub_1", type: "invoice" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/invoices");
  assertEquals(queryOf(calls[0].url), { subscription_id: "sub_1", type: "invoice" });
});
