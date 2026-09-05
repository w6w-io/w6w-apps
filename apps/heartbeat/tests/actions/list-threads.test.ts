import { assertEquals } from "@std/assert";
import listThreads from "../../actions/list-threads.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("list-threads: GET /channels/{id}/threads, wrapped under `threads`", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "t1" }] }]);
  const out = await listThreads.execute({ channelID: "ch1" }, ctx) as { threads: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v0/channels/ch1/threads");
  assertEquals(out.threads.length, 1);
});
