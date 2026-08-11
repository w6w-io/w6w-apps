import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/askfred-continue.ts";

const OK = { data: { continueAskFredThread: { message: { thread_id: "th1" } } } };

Deno.test("askfred-continue: sends the thread id and follow-up in the input object", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ threadId: "th1", query: "And the budget?" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("mutation ContinueAskFredThread($input: ContinueAskFredThreadInput!)"));
  assertEquals(variables.input, { thread_id: "th1", query: "And the budget?" });
});

Deno.test("askfred-continue: optional formatting fields are only sent when set", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute(
    { threadId: "th1", query: "q", responseLanguage: "es", formatMode: "plaintext" },
    ctx,
  );
  assertEquals(sent(calls[0]).variables.input, {
    thread_id: "th1",
    query: "q",
    response_language: "es",
    format_mode: "plaintext",
  });
});
