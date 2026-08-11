import { assert, assertEquals, assertRejects } from "@std/assert";
import photoList from "../../actions/photo-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("photo-list: maps single-id filters onto the plural query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await photoList.execute({
    projectId: "94772883",
    userId: "9",
    groupId: "8",
    tagId: "7",
    startDate: "1637770053",
    endDate: "1637856453",
    after: "cursor1",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/photos");
  assertEquals(queryOf(calls[0].url), {
    project_ids: "94772883",
    user_ids: "9",
    group_ids: "8",
    tag_ids: "7",
    start_date: "1637770053",
    end_date: "1637856453",
    after: "cursor1",
  });
});

Deno.test("photo-list: refuses two cursors at once", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await photoList.execute({ after: "a", before: "b" }, ctx),
    Error,
    "only one of After",
  );
  assertEquals(calls.length, 0);
});

Deno.test("photo-list: returns items, count and the cursor headers", async () => {
  const { ctx } = mockCtx([{
    body: [{ id: "1" }, { id: "2" }],
    headers: { "content-type": "application/json", "x-next-cursor": "n", "x-has-next": "true" },
  }]);
  const page = await photoList.execute({}, ctx);
  assertEquals(page.count, 2);
  assertEquals(page.nextCursor, "n");
  assert(page.hasNext);
});
