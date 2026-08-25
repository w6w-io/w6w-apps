import { assertEquals } from "@std/assert";
import fieldUpdate from "../../actions/field-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("field-update: POSTs a JSON body with only the name", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Renamed", key: "1001" } }]);
  await fieldUpdate.execute({ pipelineKey: "p1", fieldKey: "1001", name: "Renamed" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/fields/1001");
  assertEquals(JSON.parse(calls[0].body!), { name: "Renamed" });
});
