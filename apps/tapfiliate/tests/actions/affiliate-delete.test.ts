import { assertEquals } from "@std/assert";
import affiliateDelete from "../../actions/affiliate-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-delete: DELETEs by affiliate id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await affiliateDelete.execute({ affiliateId: "janejameson" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/affiliates/janejameson/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { result: null });
});
