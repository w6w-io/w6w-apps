import { assert, assertEquals } from "@std/assert";
import transferCreate from "../../actions/transfer-create.ts";
import { deriveUuid } from "../../lib/client.ts";
import { mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

const TRANSFER = { id: 1, status: "incoming_payment_waiting", quoteUuid: "q-1" };

Deno.test("transfer-create: POSTs targetAccount/quoteUuid and a caller-supplied idempotency key", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: TRANSFER }]);
  const out = await transferCreate.execute(
    {
      targetAccount: 5,
      quoteUuid: "q-1",
      customerTransactionId: "11111111-1111-5111-8111-111111111111",
    },
    ctx,
  ) as { id: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/2026Q3/transfers");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.targetAccount, 5);
  assertEquals(body.quoteUuid, "q-1");
  assertEquals(body.customerTransactionId, "11111111-1111-5111-8111-111111111111");
  assertEquals(out.id, 1);
});

Deno.test("transfer-create: derives a stable UUID from the invocation when none is supplied", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 201, body: TRANSFER }], "inv_fixed_seed");
  await transferCreate.execute({ targetAccount: 5, quoteUuid: "q-1" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.customerTransactionId, await deriveUuid("inv_fixed_seed"));
});

Deno.test("transfer-create: falls back to a random UUID with no invocation at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: TRANSFER }]);
  await transferCreate.execute({ targetAccount: 5, quoteUuid: "q-1" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assert(
    /^[0-9a-f-]{36}$/.test(body.customerTransactionId),
    `not UUID-shaped: ${body.customerTransactionId}`,
  );
});

Deno.test("transfer-create: nests reference and purpose fields under details, omitting details when empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: TRANSFER }]);
  await transferCreate.execute(
    { targetAccount: 5, quoteUuid: "q-1", reference: "Invoice 42" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).details, { reference: "Invoice 42" });

  const { ctx: ctx2, calls: calls2 } = mockCtx([{ status: 201, body: TRANSFER }]);
  await transferCreate.execute({ targetAccount: 5, quoteUuid: "q-1" }, ctx2);
  assertEquals(JSON.parse(calls2[0].body!).details, undefined);
});

Deno.test("transfer-create: is declared idempotent, backed by customerTransactionId", () => {
  assertEquals(transferCreate.idempotent, true);
});
