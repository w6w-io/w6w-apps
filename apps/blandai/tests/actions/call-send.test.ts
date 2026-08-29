import { assertEquals, assertRejects } from "@std/assert";
import callSend from "../../actions/call-send.ts";
import { mockCtx, newErrorBody } from "../_helpers.ts";

Deno.test("call-send: dispatches a call and maps the flat success response", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      status: "success",
      message: "Call successfully queued.",
      call_id: "c-1",
      batch_id: null,
    },
  }]);
  const out = await callSend.execute(
    { phoneNumber: "+12223334444", task: "Say hello." },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.bland.ai/v1/calls");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.phone_number, "+12223334444");
  assertEquals(body.task, "Say hello.");
  assertEquals("pathway_id" in body, false); // compact() drops unset fields

  assertEquals(out.status, "success");
  assertEquals(out.callId, "c-1");
  assertEquals(out.batchId, undefined);
});

Deno.test("call-send: serializes metadata/requestData JSON params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { status: "success", call_id: "c-2" } }]);
  await callSend.execute({
    phoneNumber: "+12223334444",
    task: "hi",
    metadata: { orderId: "o-1" },
    requestData: '{"a":1}',
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.metadata, { orderId: "o-1" });
  assertEquals(body.request_data, { a: 1 });
});

Deno.test("call-send: surfaces the vendor's validation error", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      status: "error",
      message: "Invalid parameters",
      errors: ["Missing required parameter: task."],
    },
  }]);
  await assertRejects(
    async () => await callSend.execute({ phoneNumber: "+1" }, ctx),
    Error,
    "Missing required parameter: task.",
  );
});

Deno.test("call-send: surfaces the AUTH_FAILURE envelope", async () => {
  const { ctx } = mockCtx([{ status: 401, body: newErrorBody("AUTH_FAILURE", "Unauthorized") }]);
  await assertRejects(
    async () => await callSend.execute({ phoneNumber: "+1" }, ctx),
    Error,
    "AUTH_FAILURE",
  );
});

Deno.test("call-send: declared not idempotent", () => {
  assertEquals(callSend.idempotent, false);
});
