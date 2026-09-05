import { assertEquals } from "@std/assert";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/note-list.ts";

Deno.test("note-list: GETs /Notes with paging params", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ id: "1", Note_Title: "Notes" }], info: { count: 1 } } },
  ]);
  const out = await action.execute({ page: 1, per_page: 200 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/recruit/v2/Notes");
  assertEquals(url.searchParams.get("per_page"), "200");
  assertEquals(out, { data: [{ id: "1", Note_Title: "Notes" }], info: { count: 1 } });
});
