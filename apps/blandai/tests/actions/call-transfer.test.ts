import { assertEquals, assertRejects } from "@std/assert";
import callTransfer from "../../actions/call-transfer.ts";
import { mockCtx, newErrorBody, pathOf } from "../_helpers.ts";

Deno.test("call-transfer: posts call_id/transfer_number and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { message: "Call c-1 transferred to +12223334444 successfully" }, errors: null },
  }]);
  const out = await callTransfer.execute(
    { callId: "c-1", transferNumber: "+12223334444" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/calls/active/transfer");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { call_id: "c-1", transfer_number: "+12223334444" });
  assertEquals(out.message, "Call c-1 transferred to +12223334444 successfully");
});

Deno.test("call-transfer: surfaces a NOT_FOUND error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: newErrorBody("NOT_FOUND", "Call with id c-1 not found or has already been completed."),
  }]);
  await assertRejects(
    async () => await callTransfer.execute({ callId: "c-1", transferNumber: "+1" }, ctx),
    Error,
    "NOT_FOUND",
  );
});

Deno.test("call-transfer: is declared not idempotent", () => {
  assertEquals(callTransfer.idempotent, false);
});
