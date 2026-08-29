import { assertEquals } from "@std/assert";
import sourceList from "../../actions/source-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("source-list: GET /agents/{id}/sources", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "s1", type: "text" }]) }]);
  const out = await sourceList.execute({ agentId: "a1" }, ctx) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources");
  assertEquals(out.data.length, 1);
});

Deno.test("source-list: joins a type array into a comma list, forwards name filter", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await sourceList.execute({ agentId: "a1", type: ["file", "qna"], name: "handbook" }, ctx);
  assertEquals(queryOf(calls[0].url), { type: "file,qna", name: "handbook" });
});
