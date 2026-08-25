import { assertEquals } from "@std/assert";
import fieldGet from "../../actions/field-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-get: calls GET .../fields/{fieldKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "1003", name: "Start Date", type: "DATE" } }]);
  await fieldGet.execute({ pipelineKey: "p1", fieldKey: "1003" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/fields/1003");
});
