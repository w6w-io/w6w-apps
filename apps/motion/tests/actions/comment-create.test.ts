import { assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-create: POSTs /v1/comments with content-type set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "c1" } }]);
  await commentCreate.execute({ taskId: "t1", content: "**done**" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/comments");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), { taskId: "t1", content: "**done**" });
});

/**
 * The reference marks `content` optional, which is preserved rather than
 * tightened — a form rule this app invented would diverge from the vendor.
 */
Deno.test("comment-create: content is optional, as documented, and is omitted when empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await commentCreate.execute({ taskId: "t1" }, ctx);

  assertEquals(bodyOf(calls[0]), { taskId: "t1" });
  assertEquals(commentCreate.params?.find((p) => p.key === "content")?.required, undefined);
  assertEquals(commentCreate.idempotent, false);
});
