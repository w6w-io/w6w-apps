import { assertEquals } from "@std/assert";
import fieldDelete from "../../actions/field-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("field-delete: DELETEs the field", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await fieldDelete.execute({ pipelineKey: "p1", fieldKey: "1001" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v1/pipelines/p1/fields/1001");
  assertEquals(out, { success: true });
});
