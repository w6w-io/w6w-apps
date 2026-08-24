import { assertEquals } from "@std/assert";
import membershipDelete from "../../actions/membership-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("membership-delete: DELETEs /api/community/memberships/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await membershipDelete.execute({ id: "1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/community/memberships/1");
  assertEquals(out, { status: 204 });
});
