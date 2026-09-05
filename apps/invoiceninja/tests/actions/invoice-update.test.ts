import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/invoice-update.ts";

Deno.test("invoice-update: PUTs /invoices/{id}, omitting line_items when unset", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "inv1" } }]);
  await action.execute({ invoiceId: "inv1", number: "INV-0002" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.number, "INV-0002");
  assertEquals("line_items" in body, false);
});

Deno.test("invoice-update: replaces line_items when set", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "inv1" } }]);
  await action.execute({ invoiceId: "inv1", lineItems: [{ cost: 5 }] }, ctx);
  assertEquals(JSON.parse(calls[0].body!).line_items, [{ cost: 5 }]);
});
