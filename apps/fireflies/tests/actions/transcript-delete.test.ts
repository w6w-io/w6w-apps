import { assert, assertEquals } from "@std/assert";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/transcript-delete.ts";

Deno.test("transcript-delete: returns the deleted record, which is the last copy of it", async () => {
  const { ctx, calls, logs } = mockCtx([{
    body: { data: { deleteTranscript: { id: "t1", title: "Weekly sync" } } },
  }]);
  await action.execute({ transcriptId: "t1" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("deleteTranscript(id: $transcriptId)"));
  assert(query.includes("title"));
  assert(query.includes("transcript_url"));
  assertEquals(variables, { transcriptId: "t1" });
  assertEquals(logs[0].level, "warn");
});

Deno.test("transcript-delete: is not idempotent — a second call is object_not_found", () => {
  assertEquals(action.idempotent, false);
});
