import { assertEquals } from "@std/assert";
import conversionDelete from "../../actions/conversion-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("conversion-delete: DELETEs by numeric id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await conversionDelete.execute({ conversionId: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/conversions/1/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { result: null });
});
