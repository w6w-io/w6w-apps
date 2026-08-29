import { assertEquals } from "@std/assert";
import commentThreadList from "../../actions/comment-thread-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("comment-thread-list: defaults to unresolved", () => {
  const statusParam = commentThreadList.params?.find((p) => p.key === "status");
  assertEquals(statusParam?.default, "unresolved");
});

Deno.test("comment-thread-list: lists threads on a draft with the given filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "t1", status: "resolved" }]) }]);
  await commentThreadList.execute({
    socialSetId: 4,
    draftId: 12,
    platform: "x",
    status: "all",
    limit: 50,
    offset: 0,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/social-sets/4/drafts/12/comment-threads");
  assertEquals(queryOf(calls[0].url), { platform: "x", status: "all", limit: "50", offset: "0" });
});
