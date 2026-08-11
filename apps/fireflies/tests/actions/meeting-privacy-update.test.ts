import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/meeting-privacy-update.ts";

Deno.test("meeting-privacy-update: sends id and privacy inside the input object", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { updateMeetingPrivacy: { id: "t1", privacy: "teammates" } } },
  }]);
  await action.execute({ transcriptId: "t1", privacy: "teammates" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation UpdateMeetingPrivacy($input: UpdateMeetingPrivacyInput!)"));
  assertEquals(variables.input, { id: "t1", privacy: "teammates" });
});

Deno.test("meeting-privacy-update: offers exactly the five documented values", () => {
  const opts = action.params!.find((p) => p.key === "privacy")!.options as Array<{ value: string }>;
  assertEquals(opts.map((o) => o.value).sort(), [
    "link",
    "owner",
    "participants",
    "teammates",
    "teammatesandparticipants",
  ]);
});
