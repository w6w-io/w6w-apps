import { assertEquals } from "@std/assert";
import invoiceGet from "../../actions/invoice-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("invoice-get: GETs /ar/invoices/{invoiceId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "inv_1", status: "draft" } }]);
  const out = await invoiceGet.execute({ invoiceId: "inv_1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/ar/invoices/inv_1");
  assertEquals((out.invoice as { status: string }).status, "draft");
});
