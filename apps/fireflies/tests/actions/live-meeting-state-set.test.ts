import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/live-meeting-state-set.ts";

Deno.test("live-meeting-state-set: sends the documented input object", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { updateMeetingState: { success: true, action: "pause_recording" } } },
  }]);
  await action.execute({ meetingId: "m1", action: "pause_recording" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation UpdateMeetingState($input: UpdateMeetingStateInput!)"));
  assertEquals(variables.input, { meeting_id: "m1", action: "pause_recording" });
});

Deno.test("live-meeting-state-set: offers exactly the two documented actions", () => {
  const opts = action.params!.find((p) => p.key === "action")!.options as Array<
    { value: string }
  >;
  assertEquals(opts.map((o) => o.value), ["pause_recording", "resume_recording"]);
  // Setting the same state twice lands on the same state.
  assertEquals(action.idempotent, true);
});
