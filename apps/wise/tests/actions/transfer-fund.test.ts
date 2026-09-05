import { assertEquals, assertRejects } from "@std/assert";
import transferFund from "../../actions/transfer-fund.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transfer-fund: POSTs the funding type and balanceId for BALANCE funding", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "COMPLETED", type: "BALANCE" } }]);
  const out = await transferFund.execute(
    { profileId: 1, transferId: 9, type: "BALANCE", balanceId: 100 },
    ctx,
  ) as { status: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/2026Q3/profiles/1/transfers/9/payments");
  assertEquals(JSON.parse(calls[0].body!), { type: "BALANCE", balanceId: 100 });
  assertEquals(out.status, "COMPLETED");
});

Deno.test("transfer-fund: rejects BALANCE funding with no balanceId, before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await transferFund.execute({ profileId: 1, transferId: 9, type: "BALANCE" }, ctx),
    Error,
    "balanceId is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("transfer-fund: is not declared idempotent", () => {
  assertEquals(transferFund.idempotent, false);
});

Deno.test("transfer-fund: describes the SCA/country restriction rather than hiding it", () => {
  assertEquals(transferFund.description?.includes("SCA-protected"), true);
});
