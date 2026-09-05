import { assertEquals } from "@std/assert";
import commentCreate from "../../actions/comment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("comment-create: POST /tasks/:task_id/comments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2, text: "Looks awesome!" } }]);
  const out = await commentCreate.execute({ taskId: 123, text: "Looks awesome!" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/tasks/123/comments");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { text: "Looks awesome!" });
  assertEquals(out, { id: 2, text: "Looks awesome!" });
});
