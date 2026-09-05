import { assertEquals } from "@std/assert";
import commentGetMany from "../../actions/comment-get-many.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-get-many: GETs /issue/{key}/comment with pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { comments: [], total: 0, startAt: 0 } }]);
  await commentGetMany.execute({ issueKey: "ENG-1", maxResults: 25, startAt: 5 }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/api/2/issue/ENG-1/comment");
  assertEquals(queryOf(calls[0].url), { maxResults: "25", startAt: "5" });
});
