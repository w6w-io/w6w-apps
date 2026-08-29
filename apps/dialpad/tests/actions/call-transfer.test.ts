import { assertEquals } from "@std/assert";
import callTransfer from "../../actions/call-transfer.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-transfer: number destination", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "1" } }]);
  await callTransfer.execute(
    { callId: "1", destinationType: "number", number: "+14155550100" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/api/v2/call/1/transfer");
  assertEquals(JSON.parse(calls[0].body!).to, { number: "+14155550100" });
});

Deno.test("call-transfer: target destination coerces target id to a number", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "1" } }]);
  await callTransfer.execute(
    { callId: "1", destinationType: "target", targetId: "9", targetType: "office" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).to, { target_id: 9, target_type: "office" });
});

Deno.test("call-transfer: call destination", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "1" } }]);
  await callTransfer.execute({ callId: "1", destinationType: "call", toCallId: "77" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).to, { call_id: 77 });
});

Deno.test("call-transfer: agent destination sends both operator and target ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { call_id: "1" } }]);
  await callTransfer.execute(
    { callId: "1", destinationType: "agent", operatorId: "3", targetId: "9" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).to, { operator_id: 3, target_id: 9 });
});

Deno.test("call-transfer: declared non-idempotent", () => {
  assertEquals(callTransfer.idempotent, false);
});
