import { assertEquals } from "@std/assert";
import { mockFreshBooksCtx } from "../_helpers.ts";
import action from "../../actions/invoice-create.ts";

const LINES = [{ name: "Consulting", qty: 1, unit_cost: { amount: "100", code: "USD" } }];

Deno.test("invoice-create: POSTs /invoices/invoices with customerid and lines", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{
    body: { response: { result: { invoice: { id: 1 } } } },
  }]);
  await action.execute({ customerId: "806", lines: LINES }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/invoices/invoices",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    invoice: { customerid: "806", lines: LINES },
  });
});

Deno.test("invoice-create: merges additionalFields and accepts lines as a JSON string", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: {} }]);
  await action.execute({
    customerId: "806",
    lines: JSON.stringify(LINES),
    notes: "Thanks!",
    additionalFields: { po_number: "PO-42" },
  }, ctx);
  const body = JSON.parse(calls[0].body!).invoice;
  assertEquals(body.lines, LINES);
  assertEquals(body.notes, "Thanks!");
  assertEquals(body.po_number, "PO-42");
});
