import { assertEquals } from "@std/assert";
import getCall from "../../actions/get-call.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-call: GETs /v2/get-call/{call_id}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { call_id: "c1", call_type: "phone_call", call_status: "ended", agent_id: "a1" },
  }]);

  const out = await getCall.execute({ callId: "c1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/get-call/c1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.call_status, "ended");
});

Deno.test("get-call: a call still in progress carries no transcript/recording — not an error", async () => {
  const { ctx } = mockCtx([{
    body: { call_id: "c1", call_type: "phone_call", call_status: "ongoing", agent_id: "a1" },
  }]);
  const out = await getCall.execute({ callId: "c1" }, ctx);
  assertEquals(out.call_status, "ongoing");
  assertEquals(out.transcript, undefined);
});

Deno.test("get-call: URL-encodes the call id", async () => {
  const { ctx, calls } = mockCtx([{ body: { call_id: "c/1" } }]);
  await getCall.execute({ callId: "c/1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/get-call/c%2F1");
});
