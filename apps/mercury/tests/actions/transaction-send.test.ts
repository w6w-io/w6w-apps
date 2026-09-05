import { assert, assertEquals } from "@std/assert";
import transactionSend from "../../actions/transaction-send.ts";
import { mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("transaction-send: POSTs /account/{id}/transactions with the required fields", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: { id: "tx_new", status: "pending" } }]);
  const out = await transactionSend.execute(
    { accountId: "acc_1", recipientId: "rec_1", amount: 100, paymentMethod: "ach" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/api/v1/account/acc_1/transactions");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.recipientId, "rec_1");
  assertEquals(body.amount, 100);
  assertEquals(body.paymentMethod, "ach");
  assertEquals(typeof body.idempotencyKey, "string");
  assert(body.idempotencyKey.length > 0);
  assertEquals((out.transaction as { id: string }).id, "tx_new");
});

Deno.test("transaction-send: reuses ctx.invocation.invocationId as the idempotency key", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: {} }], "inv_fixed_123");
  await transactionSend.execute(
    { accountId: "acc_1", recipientId: "rec_1", amount: 1, paymentMethod: "ach" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).idempotencyKey, "inv_fixed_123");
});

Deno.test("transaction-send: builds the nested purpose.simple object only when a category is given", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: {} }]);
  await transactionSend.execute(
    {
      accountId: "acc_1",
      recipientId: "rec_1",
      amount: 500,
      paymentMethod: "domesticWire",
      purposeCategory: "vendor",
      purposeAdditionalInfo: "Acme Corp",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.purpose, { simple: { category: "vendor", additionalInfo: "Acme Corp" } });
});

Deno.test("transaction-send: omits purpose entirely when no category is given", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: {} }]);
  await transactionSend.execute(
    { accountId: "acc_1", recipientId: "rec_1", amount: 500, paymentMethod: "ach" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals("purpose" in body, false);
});

Deno.test("transaction-send: declares idempotent true, backed by the vendor's required idempotencyKey", () => {
  assertEquals(transactionSend.idempotent, true);
});
