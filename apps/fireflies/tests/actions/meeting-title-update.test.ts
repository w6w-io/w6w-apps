import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/meeting-title-update.ts";

Deno.test("meeting-title-update: sends id and title inside the input object", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { updateMeetingTitle: { title: "New" } } } }]);
  await action.execute({ transcriptId: "t1", title: "New title" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation UpdateMeetingTitle($input: UpdateMeetingTitleInput!)"));
  assertEquals(variables.input, { id: "t1", title: "New title" });
});

Deno.test("meeting-title-update: carries the vendor's 5-256 character rule", () => {
  assertEquals(
    action.params!.find((p) => p.key === "title")!.validation,
    { minLength: 5, maxLength: 256 },
  );
  assertEquals(action.idempotent, true);
});
