import { assert, assertEquals, assertRejects } from "@std/assert";
import transferCancel from "../../actions/transfer-cancel.ts";
import { mockCtx, pathOf, validationErrorBody } from "../_helpers.ts";

Deno.test("transfer-cancel: PUTs /transfers/{transferId}/cancel", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 3, status: "cancelled" } }]);
  const out = await transferCancel.execute({ transferId: 3 }, ctx) as { status: string };

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/2026Q3/transfers/3/cancel");
  assertEquals(out.status, "cancelled");
});

Deno.test("transfer-cancel: surfaces Wise's documented 409 conflict verbatim", async () => {
  const { ctx } = mockCtx([
    {
      status: 409,
      body: validationErrorBody([{ code: "transfer.cancellation.not.allowed" }]),
    },
  ]);
  await assertRejects(
    async () => await transferCancel.execute({ transferId: 3 }, ctx),
    Error,
    "transfer.cancellation.not.allowed",
  );
});

Deno.test("transfer-cancel: is declared idempotent", () => {
  assert(transferCancel.idempotent === true);
});
