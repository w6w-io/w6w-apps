import { assertEquals } from "@std/assert";
import transferGet from "../../actions/transfer-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transfer-get: GETs /transfers/{transferId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, status: "funds_converted" } }]);
  const out = await transferGet.execute({ transferId: 7 }, ctx) as { id: number };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/transfers/7");
  assertEquals(out.id, 7);
});
