import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/refund-create.ts";

Deno.test("refund-create: posts the transaction id, unwrapped, to /refunds", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { object_id: "rfn_1", status: "QUEUED" } }]);
  const result = await action.execute!({ transactionId: "trn_1" }, ctx) as { status?: string };
  assertEquals(calls[0].url, "https://api.goshippo.com/refunds");
  assertEquals(JSON.parse(calls[0].body!), { transaction: "trn_1" });
  assertEquals(result.status, "QUEUED");
});

Deno.test("refund-create: `transactionId` is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "transactionId");
  assertEquals(calls.length, 0);
});

Deno.test("refund-create: is not idempotent, and its own description says a refund is not guaranteed", () => {
  assertEquals(action.idempotent, false);
  assertEquals(/[Nn]ot guaranteed/.test(action.description!), true);
});
