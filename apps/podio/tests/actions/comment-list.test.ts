import { assertEquals } from "@std/assert";
import commentList from "../../actions/comment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const COMMENTS = [
  { comment_id: 1, value: "oldest", created_on: "2026-01-01 09:00:00" },
  { comment_id: 2, value: "newest", created_on: "2026-01-02 09:00:00" },
];

Deno.test("comment-list: GETs the polymorphic comment collection", async () => {
  const { ctx, calls } = mockCtx([{ body: COMMENTS }]);
  const out = await commentList.execute({ refType: "item", refId: "9" }, ctx);
  assertEquals(out, { comments: COMMENTS });
  assertEquals(pathOf(calls[0].url), "/comment/item/9/");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("comment-list: paging reaches the query string, including offset 0", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await commentList.execute({ refType: "task", refId: "5", limit: 10, offset: 0 }, ctx);
  // `offset: 0` is a value, not an absence, and reaches the wire as one.
  assertEquals(queryOf(calls[0].url), { limit: "10", offset: "0" });
  assertEquals(pathOf(calls[0].url), "/comment/task/5/");
});

/**
 * Podio sorts these ASCENDING, unlike almost everything else in the API — so a
 * workflow reacting to "the latest comment" wants the tail. The output label
 * has to say so, because nothing in the payload does.
 */
Deno.test("comment-list: the output field states the oldest-first ordering", () => {
  const output = commentList.output as Array<{ key: string; label: string }>;
  assertEquals(output[0].key, "comments");
  assertEquals(output[0].label.includes("oldest first"), true);
});

Deno.test("comment-list: the reference type is a closed vocabulary", () => {
  const refType = commentList.params!.find((p) => p.key === "refType")!;
  assertEquals(refType.validation?.enum, ["item", "task", "status", "app", "space", "file"]);
});
