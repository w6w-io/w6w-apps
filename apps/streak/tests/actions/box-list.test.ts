import { assertEquals } from "@std/assert";
import boxList from "../../actions/box-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("box-list: calls GET .../boxes and returns the bare array as results", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ key: "b1" }] }]);
  const out = await boxList.execute({ pipelineKey: "p1" }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/boxes");
  assertEquals(out.results.length, 1);
});

Deno.test("box-list: forwards stageKey, page and limit", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await boxList.execute({ pipelineKey: "p1", stageKey: "5001", page: 2, limit: 50 }, ctx);
  assertEquals(queryOf(calls[0].url), { stageKey: "5001", page: "2", limit: "50" });
});
