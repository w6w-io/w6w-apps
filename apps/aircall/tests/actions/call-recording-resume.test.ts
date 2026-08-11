import { assertEquals } from "@std/assert";
import callRecordingResume from "../../actions/call-recording-resume.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("call-recording-resume: POSTs /v1/calls/{id}/resume_recording", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await callRecordingResume.execute({ callId: "812" }, ctx) as { status: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/calls/812/resume_recording");
  assertEquals(out.status, 204);
});
