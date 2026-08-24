import { assertEquals } from "@std/assert";
import queueList from "../../actions/queue-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("queue-list: calls GET /queue.json", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uuid: "q1", name: "Unassigned" }] }]);
  const out = await queueList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api_1.0/queue.json");
  assertEquals(out.items, [{ uuid: "q1", name: "Unassigned" }]);
});
