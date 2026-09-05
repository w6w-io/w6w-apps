import { assertEquals, assertRejects } from "@std/assert";
import chargeGet from "../../actions/charge-get.ts";
import { envelope, mockCtx, pathOf, singleErrorBody } from "../_helpers.ts";

Deno.test("charge-get: hits GET /charges/{id} and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope("charge", { id: 1, status: "success" }) }]);
  const out = await chargeGet.execute({ chargeId: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/charges/1");
  assertEquals(out, { id: 1, status: "success" });
});

Deno.test("charge-get: a charge older than the 90-day window surfaces the vendor's own error", async () => {
  const { ctx } = mockCtx([{ status: 404, body: singleErrorBody("charge not found") }]);
  await assertRejects(
    async () => await chargeGet.execute({ chargeId: "old" }, ctx),
    Error,
    "charge not found",
  );
});
