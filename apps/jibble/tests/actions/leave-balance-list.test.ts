import { assertEquals } from "@std/assert";
import leaveBalanceList from "../../actions/leave-balance-list.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

Deno.test("leave-balance-list: calls GET /v1/LeaveBalances", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ personId: "p1", balance: 12 }]) }]);
  const out = await leaveBalanceList.execute({}, ctx) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v1/LeaveBalances");
  assertEquals(out.items, [{ personId: "p1", balance: 12 }]);
});
