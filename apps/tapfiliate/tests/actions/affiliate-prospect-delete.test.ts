import { assertEquals } from "@std/assert";
import affiliateProspectDelete from "../../actions/affiliate-prospect-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("affiliate-prospect-delete: DELETEs by prospect id", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await affiliateProspectDelete.execute({ affiliateProspectId: "peterpeterson" }, ctx);

  assertEquals(pathOf(calls[0].url), "/1.6/affiliate-prospects/peterpeterson/");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { result: null });
});
