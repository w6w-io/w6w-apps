import { assertEquals } from "@std/assert";
import opportunitiesDelete from "../../actions/opportunities-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("opportunities-delete: DELETEs /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await opportunitiesDelete.execute({ opportunityId: 120611418 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/opportunities/120611418");
  assertEquals(out, { success: true });
});
