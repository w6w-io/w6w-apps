import { assert, assertEquals, assertThrows } from "@std/assert";
import listNotes from "../../actions/list-notes.ts";
import { noteVisibilityFilterOptions, noteVisibilityWriteOptions } from "../../lib/params.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-notes: calls GET /v3/notes", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1 }])]);
  await listNotes.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/notes");
});

/**
 * The second read/write vocabulary split in this API, and the one most likely to
 * be hit by copying a value out of a list result into a create step. The two
 * lists must never share a member.
 */
Deno.test("list-notes: the read and write visibility vocabularies are disjoint", () => {
  const read = noteVisibilityFilterOptions.map((o) => o.value);
  const write = noteVisibilityWriteOptions.map((o) => o.value);
  assertEquals(read, ["publicly_visible", "privately_visible", "admin_only_visible"]);
  assertEquals(write, ["public", "private", "admin_only"]);
  assertEquals(read.filter((v) => write.includes(v)), []);
});

Deno.test("list-notes: maps its filters", async () => {
  const { ctx, calls } = mockCtx([listPage([])]);
  await listNotes.execute({
    candidateIds: "1",
    applicationIds: "2",
    userIds: "3",
    type: "EMAIL",
    visibility: "publicly_visible",
  }, ctx);

  assertEquals(queryOf(calls[0].url), {
    candidate_ids: "1",
    application_ids: "2",
    user_ids: "3",
    type: "EMAIL",
    visibility: "publicly_visible",
  });
});

Deno.test("list-notes: the visibility hint points at the other spelling", () => {
  const param = (listNotes.params ?? []).find((p) => p.key === "visibility");
  assert(param?.hint?.includes("READ spellings"), param?.hint);
});

Deno.test("list-notes: a cursor rejects the type filter it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(() => listNotes.execute({ cursor: "N", type: "NOTE" }, ctx), Error);
  assert(err.message.includes("type"), err.message);
});
