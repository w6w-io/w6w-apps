import { assert, assertEquals, assertRejects } from "@std/assert";
import projectPhotoList from "../../actions/project-photo-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-photo-list: maps filters onto the vendor's plural query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await projectPhotoList.execute({
    projectId: "94772883",
    startDate: "1637770053",
    endDate: "1637856453",
    userId: "9",
    groupId: "8",
    tagId: "7",
    perPage: 100,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/projects/94772883/photos");
  assertEquals(queryOf(calls[0].url), {
    start_date: "1637770053",
    end_date: "1637856453",
    user_ids: "9",
    group_ids: "8",
    tag_ids: "7",
    per_page: "100",
  });
});

/** The cursors arrive only as headers — the body is a bare array. */
Deno.test("project-photo-list: surfaces the cursor headers as outputs", async () => {
  const { ctx } = mockCtx([{
    body: [{ id: "1" }],
    headers: {
      "content-type": "application/json",
      "x-next-cursor": "next123",
      "x-has-next": "true",
      "x-has-prev": "false",
    },
  }]);
  const page = await projectPhotoList.execute({ projectId: "1" }, ctx);
  assertEquals(page.nextCursor, "next123");
  assertEquals(page.hasNext, true);
  assertEquals(page.hasPrev, false);
  const keys = (projectPhotoList.output as Array<{ key: string }>).map((o) => o.key);
  for (const key of ["nextCursor", "prevCursor", "hasNext", "hasPrev"]) {
    assert(keys.includes(key), `${key} is not declared as an output`);
  }
});

Deno.test("project-photo-list: refuses page + cursor, which the vendor documents as illegal", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await projectPhotoList.execute({ projectId: "1", page: 2, after: "c" }, ctx),
    Error,
    "Page cannot be combined with a cursor",
  );
  assertEquals(calls.length, 0);
});
