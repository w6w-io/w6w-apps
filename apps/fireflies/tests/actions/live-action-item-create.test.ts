import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/live-action-item-create.ts";

Deno.test("live-action-item-create: sends the documented input object", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { createLiveActionItem: { success: true } } } }]);
  await action.execute({ meetingId: "m1", prompt: "Follow up on the proposal" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation CreateLiveActionItem($input: CreateLiveActionItemInput!)"));
  assertEquals(variables.input, { meeting_id: "m1", prompt: "Follow up on the proposal" });
});

Deno.test("live-action-item-create: enforces the documented prompt length and is not idempotent", () => {
  const prompt = action.params!.find((p) => p.key === "prompt")!;
  assertEquals(prompt.validation, { minLength: 5, maxLength: 255 });
  // Fred re-interprets the prompt each call, so a retry files a second item.
  assertEquals(action.idempotent, false);
});
