import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: forwards filters and defaults per to 20", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("transactions", []) }]);
  await transactionList.execute({ courseId: 1, isFullyRefunded: false }, ctx);

  assertEquals(queryOf(calls[0].url), { course_id: "1", is_fully_refunded: "false", per: "20" });
});
