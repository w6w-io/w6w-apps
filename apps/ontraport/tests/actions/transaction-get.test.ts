import { assertEquals } from "@std/assert";
import transactionGet from "../../actions/transaction-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-get: calls GET /1/Transaction?id=...", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "1", total: "400.00" }) }]);
  const out = await transactionGet.execute({ id: "1" }, ctx) as { total: string };

  assertEquals(pathOf(calls[0].url), "/1/Transaction");
  assertEquals(queryOf(calls[0].url), { id: "1" });
  assertEquals(out.total, "400.00");
});
