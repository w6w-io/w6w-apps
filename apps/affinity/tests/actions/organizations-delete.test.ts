import { assertEquals } from "@std/assert";
import organizationsDelete from "../../actions/organizations-delete.ts";
import { mockCtx, pathOf, successBody } from "../_helpers.ts";

Deno.test("organizations-delete: DELETEs /organizations/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: successBody() }]);
  const out = await organizationsDelete.execute({ organizationId: 120611418 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/organizations/120611418");
  assertEquals(out, { success: true });
});
