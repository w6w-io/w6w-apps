import { assertEquals } from "@std/assert";
import getThread from "../../actions/get-thread.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-thread: GET /threads/{id}, includes comments", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1", comments: [{ id: "c1" }] } }]);
  const out = await getThread.execute({ threadID: "t1" }, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v0/threads/t1");
  assertEquals((out.comments as unknown[]).length, 1);
});
