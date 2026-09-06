import { assertEquals } from "@std/assert";
import action from "../../actions/get-absence-balance.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-absence-balance: distinguishes balance from availableBalance", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        success: true,
        data: [
          {
            id: 1234,
            name: "Paid Vacation",
            category: "custom_absence",
            balance: 10.5,
            available_balance: 8.5,
          },
        ],
      },
    },
  ]);
  const out = await action.execute({ employeeId: 42 }, ctx) as {
    balances: Array<{ balance: number; availableBalance: number }>;
  };
  assertEquals(pathOf(calls[0].url), "/v1/company/employees/42/absences/balance");
  assertEquals(out.balances[0].balance, 10.5);
  assertEquals(out.balances[0].availableBalance, 8.5);
});
