import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transaction-get.ts";

Deno.test("transaction-get: reads GET /transactions/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { object_id: "trn_1", status: "SUCCESS" },
  }]);
  const result = await action.execute!({ transactionId: "trn_1" }, ctx) as { status?: string };
  assertEquals(calls[0].url, "https://api.goshippo.com/transactions/trn_1");
  assertEquals(result.status, "SUCCESS");
});

Deno.test("transaction-get: `transactionId` is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "transactionId");
  assertEquals(calls.length, 0);
});
