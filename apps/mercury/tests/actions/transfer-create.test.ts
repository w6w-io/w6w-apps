import { assertEquals } from "@std/assert";
import transferCreate from "../../actions/transfer-create.ts";
import { mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("transfer-create: POSTs /transfer with source/destination/amount/idempotencyKey", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ body: { creditTransaction: { id: "tx_credit" }, debitTransaction: { id: "tx_debit" } } }],
    "inv_transfer_1",
  );
  const out = await transferCreate.execute(
    { sourceAccountId: "acc_1", destinationAccountId: "acc_2", amount: 250 },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/transfer");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    sourceAccountId: "acc_1",
    destinationAccountId: "acc_2",
    amount: 250,
    idempotencyKey: "inv_transfer_1",
    note: null,
  });
  assertEquals((out.creditTransaction as { id: string }).id, "tx_credit");
  assertEquals((out.debitTransaction as { id: string }).id, "tx_debit");
});

Deno.test("transfer-create: declares idempotent true, backed by the vendor's required idempotencyKey", () => {
  assertEquals(transferCreate.idempotent, true);
});
