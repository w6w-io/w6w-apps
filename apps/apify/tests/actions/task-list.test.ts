import { assertEquals } from "@std/assert";
import taskList from "../../actions/task-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-list: calls GET /v2/actor-tasks and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "t1" }]) }]);
  const out = await taskList.execute({ limit: 100, desc: true }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/actor-tasks");
  assertEquals(queryOf(calls[0].url), { limit: "100", desc: "1" });
  assertEquals(out.items, [{ id: "t1" }]);
});

Deno.test("task-list: prefills a limit below Apify's 1000 default", () => {
  assertEquals(taskList.params?.find((p) => p.key === "limit")?.default, 100);
});
