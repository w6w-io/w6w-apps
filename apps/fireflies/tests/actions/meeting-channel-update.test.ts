import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/meeting-channel-update.ts";

Deno.test("meeting-channel-update: transcript ids become an array inside the input", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { updateMeetingChannel: [{ id: "t1" }] } } }]);
  await action.execute({ transcriptIds: "t1, t2", channelId: "c1" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation UpdateMeetingChannel($input: UpdateMeetingChannelInput!)"));
  assertEquals(variables.input, { transcript_ids: ["t1", "t2"], channel_id: "c1" });
});

Deno.test("meeting-channel-update: assigning the same channel again is idempotent", () => {
  assertEquals(action.idempotent, true);
});
