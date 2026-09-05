import { assertEquals } from "@std/assert";
import candidateNoteList from "../../actions/candidate-note-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("candidate-note-list: lists a candidate's notes", async () => {
  const notes = [{ id: 1, body: "Test" }];
  const { ctx, calls } = mockCtx([{ status: 200, body: { notes, references: [] } }]);
  const out = await candidateNoteList.execute({ candidateId: 12 }, ctx) as { notes: unknown };

  assertEquals(pathOf(calls[0].url), "/c/123/candidates/12/notes");
  assertEquals(out.notes, notes);
});
