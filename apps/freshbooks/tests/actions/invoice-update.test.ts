import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: PUTs /invoices/invoices/{invoiceId} with the fields envelope", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { invoice: {} } } } }]);
  await action.execute({ invoiceId: "325", fields: { due_offset_days: 20 } }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/invoices/invoices/325",
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { invoice: { due_offset_days: 20 } });
});
