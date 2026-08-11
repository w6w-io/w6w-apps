import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/meeting-share.ts";

const OK = { data: { shareMeeting: { success: true, message: "shared" } } };

Deno.test("meeting-share: emails become an array inside the input object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ meetingId: "m1", emails: "a@b.com, c@d.com", expiryDays: 7 }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation ShareMeeting($input: ShareMeetingInput!)"));
  assertEquals(variables.input, {
    meeting_id: "m1",
    emails: ["a@b.com", "c@d.com"],
    expiry_days: 7,
  });
});

Deno.test("meeting-share: an omitted expiry means never expires, and is not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ meetingId: "m1", emails: "a@b.com" }, ctx);
  const input = sent(calls[0]).variables.input as Record<string, unknown>;
  assertEquals("expiry_days" in input, false);
});

Deno.test("meeting-share: offers only the three expiries Fireflies accepts", () => {
  const opts = action.params!.find((p) => p.key === "expiryDays")!.options as Array<
    { value: number }
  >;
  assertEquals(opts.map((o) => o.value), [7, 14, 30]);
});
