import { assertEquals } from "@std/assert";
import fieldList from "../../actions/field-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-list: calls GET .../fields and returns the bare array as results", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ key: "1001", name: "Position" }] }]);
  const out = await fieldList.execute({ pipelineKey: "p1" }, ctx) as { results: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/fields");
  assertEquals(out.results.length, 1);
});
