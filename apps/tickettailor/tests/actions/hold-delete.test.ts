import { assertEquals } from "@std/assert";
import holdDelete from "../../actions/hold-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("hold-delete: DELETEs and returns the 200 body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "ho_1", object: "hold", deleted: "true" },
  }]);
  const result = await holdDelete.execute({ holdId: "ho_1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/holds/ho_1");
  assertEquals(result.deleted, "true");
});
