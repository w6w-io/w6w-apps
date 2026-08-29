import { assertEquals } from "@std/assert";
import commentList from "../../actions/comment-list.ts";
import { envelope, mockWrikeCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-list: GETs /tasks/{taskId}/comments", async () => {
  const { ctx, calls } = mockWrikeCtx([{ status: 200, body: envelope([{ id: "C1" }]) }]);
  const out = await commentList.execute({ taskId: "T1", plainText: true }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v4/tasks/T1/comments");
  assertEquals(new URL(calls[0].url).searchParams.get("plainText"), "true");
  assertEquals(out.items, [{ id: "C1" }]);
});
