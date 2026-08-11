import { assert, assertEquals, assertRejects } from "@std/assert";
import callRecordingPause from "../../actions/call-recording-pause.ts";
import { appErrorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-recording-pause: POSTs /v1/calls/{id}/pause_recording", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await callRecordingPause.execute({ callId: "812" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calls/812/pause_recording");
  assertEquals(calls[0].body, null, "this endpoint takes no body");
  assertEquals(out.status, 204);
});

/**
 * 405 here is "Recording is disabled on the Call's number" — a configuration
 * state. Reading it as "wrong HTTP verb" sends the reader to fix the client.
 */
Deno.test("call-recording-pause: a 405 is explained as a state error", async () => {
  const { ctx } = mockCtx([
    {
      status: 405,
      body: appErrorBody("Method Not Allowed", "Recording is disabled on the Call's number"),
    },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(callRecordingPause.execute({ callId: "812" }, ctx)),
    Error,
  );
  assert(err.message.includes("state error"), err.message);
  assert(err.message.includes("recording disabled"), err.message);
});
