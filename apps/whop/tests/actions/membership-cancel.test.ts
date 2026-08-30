import { assertEquals } from "@std/assert";
import membershipCancel from "../../actions/membership-cancel.ts";
import { mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("membership-cancel: POSTs cancelAtPeriodEnd and reason", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1", status: "canceled" } }]);
  await membershipCancel.execute(
    { membershipId: "mem_1", cancelAtPeriodEnd: true, reason: "chargeback risk" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/memberships/mem_1/cancel");
  assertEquals(JSON.parse(calls[0].body!), {
    cancel_at_period_end: true,
    reason: "chargeback risk",
  });
});

Deno.test("membership-cancel: sends the runtime's invocationId as Idempotency-Key", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ body: { id: "mem_1" } }], "inv-abc");
  await membershipCancel.execute({ membershipId: "mem_1" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], "inv-abc");
});

Deno.test("membership-cancel: sends no Idempotency-Key when the runtime gave none", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mem_1" } }]);
  await membershipCancel.execute({ membershipId: "mem_1" }, ctx);
  assertEquals(calls[0].headers["idempotency-key"], undefined);
});

Deno.test("membership-cancel: is declared idempotent, matching its documented Idempotency-Key support", () => {
  assertEquals(membershipCancel.idempotent, true);
});
