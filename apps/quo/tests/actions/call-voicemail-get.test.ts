import { assertEquals } from "@std/assert";
import callVoicemailGet from "../../actions/call-voicemail-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-voicemail-get: GETs /v1/call-voicemails/{callId}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: { id: "vm1", status: "in-progress" } },
  }]);
  await callVoicemailGet.execute({ callId: "call1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/call-voicemails/call1");
});

Deno.test("call-voicemail-get: is a read action", () => {
  assertEquals(callVoicemailGet.type, "read");
});
