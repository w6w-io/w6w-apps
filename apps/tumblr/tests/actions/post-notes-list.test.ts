import { assertEquals } from "@std/assert";
import postNotesList from "../../actions/post-notes-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("post-notes-list: calls GET /v2/blog/{id}/notes with id and mode", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ notes: [{ type: "like" }], total_notes: 1 }) },
  ]);
  const out = await postNotesList.execute(
    { blogIdentifier: "staff.tumblr.com", id: 123, mode: "likes" },
    ctx,
  ) as { total_notes: number };

  assertEquals(pathOf(calls[0].url), "/v2/blog/staff.tumblr.com/notes");
  assertEquals(queryOf(calls[0].url), { id: "123", mode: "likes" });
  assertEquals(out.total_notes, 1);
});
